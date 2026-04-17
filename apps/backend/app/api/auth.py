from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.core.config import settings
from app.schemas.user import User, UserCreate, UserUpdate, UserPasswordUpdate, Token, TwoFactorLoginRequest
from app.schemas.user import TwoFactorEnableRequest, TwoFactorVerifyRequest, TwoFactorSetupResponse, TwoFactorDisableRequest
from app.models.user import User as UserModel
from app.utils.auth import verify_password, get_password_hash, create_access_token
from app.utils.auth import generate_totp_secret, get_totp_uri, verify_totp_code

router = APIRouter()


def get_client_ip(request: Request) -> str:
    """获取客户端 IP 地址"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# 根据 token 获取当前用户
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserModel:
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.post("/register", response_model=User)
def register(user: UserCreate, db: Session = Depends(get_db)):
    from app.core.logger import get_logger
    logger = get_logger(__name__)

    # 检查用户名是否已存在
    db_user = db.query(UserModel).filter(UserModel.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # 检查邮箱是否已存在
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # 创建新用户
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    logger.info(f"用户注册成功: username={user.username}, email={user.email}, user_id={db_user.id}")
    return db_user


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db),
    username: str = Form(...),
    password: str = Form(...),
):
    """
    用户登录接口

    参数:
        username: 用户名
        password: 密码
    """
    from app.core.logger import get_logger
    logger = get_logger(__name__)

    # 查找用户
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        ip = get_client_ip(request)
        logger.warning(f"登录失败（用户名或密码错误）: username={username}, ip={ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 检查是否启用了 2FA
    if user.two_factor_enabled:
        # 生成临时 token（仅用于 2FA 验证，不能用于访问其他 API）
        temp_token = create_access_token(
            data={"sub": user.username, "temp": True},
            expires_delta=timedelta(minutes=5)  # 5 分钟有效期
        )
        # 返回临时 token，要求用户提供 2FA 验证码
        return {
            "access_token": temp_token,
            "token_type": "bearer",
            "two_factor_required": True,
            "two_factor_secret": user.two_factor_secret
        }

    # 未启用 2FA，直接创建访问令牌和会话
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    # 创建用户会话记录
    from app.services.user_session import create_user_session
    from uuid import uuid4

    session_token = str(uuid4())
    user_agent = request.headers.get("User-Agent", "")
    ip_address = get_client_ip(request)

    create_user_session(
        db=db,
        user_id=user.id,
        session_token=session_token,
        user_agent=user_agent,
        ip_address=ip_address
    )

    logger.info(f"用户登录成功: user_id={user.id}, username={user.username}, ip={ip_address}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login/2fa", response_model=Token)
async def login_2fa(
    request: Request,
    db: Session = Depends(get_db),
    username: str = Form(...),
    code: str = Form(...),
):
    """验证 2FA 代码并完成登录（用于已启用 2FA 的用户）"""
    from jose import jwt, JWTError
    from app.core.logger import get_logger
    logger = get_logger(__name__)

    # 获取 Authorization header 中的临时 token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少临时 token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    temp_token = auth_header.replace("Bearer ", "")

    try:
        payload = jwt.decode(temp_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username_from_token: str = payload.get("sub")
        is_temp = payload.get("temp", False)

        if username_from_token is None or not is_temp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的临时 token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="临时 token 已过期或无效",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 查找用户
    user = db.query(UserModel).filter(UserModel.username == username_from_token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    # 验证 2FA 代码
    if not user.two_factor_enabled or not user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户未启用 2FA",
        )

    if not verify_totp_code(user.two_factor_secret, code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="验证码不正确",
        )

    # 2FA 验证通过，创建正式访问令牌和会话
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    # 创建用户会话记录
    from app.services.user_session import create_user_session
    from uuid import uuid4

    session_token = str(uuid4())
    user_agent = request.headers.get("User-Agent", "")
    ip_address = get_client_ip(request)

    create_user_session(
        db=db,
        user_id=user.id,
        session_token=session_token,
        user_agent=user_agent,
        ip_address=ip_address
    )

    logger.info(f"用户 2FA 登录成功: user_id={user.id}, username={user.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
def get_current_user_info(current_user: UserModel = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return current_user


@router.put("/me", response_model=User)
def update_user_info(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """更新当前用户信息（用户名/邮箱）"""
    # 如果更新用户名，检查是否已被占用
    if user_update.username and user_update.username != current_user.username:
        existing_user = db.query(UserModel).filter(
            UserModel.username == user_update.username
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        current_user.username = user_update.username

    # 如果更新邮箱，检查是否已被占用
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(UserModel).filter(
            UserModel.email == user_update.email
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def update_password(
    password_data: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """修改当前用户密码"""
    from app.core.logger import get_logger
    logger = get_logger(__name__)

    # 验证当前密码
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码不正确"
        )

    # 更新密码
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    logger.info(f"密码已更新: user_id={current_user.id}")
    return {"message": "密码已更新"}


@router.post("/me/two-factor/setup")
def setup_two_factor(
    request: TwoFactorEnableRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """设置双因素认证 (生成密钥和二维码 URL)"""
    # 验证密码
    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密码不正确"
        )

    # 生成 TOTP 密钥
    secret = generate_totp_secret()
    qr_code_url = get_totp_uri(current_user.username, secret)

    # 临时存储密钥（等待验证后正式启用）
    current_user.two_factor_secret = secret
    db.commit()

    return TwoFactorSetupResponse(secret=secret, qr_code_url=qr_code_url)


@router.post("/me/two-factor/enable")
def enable_two_factor(
    request: TwoFactorVerifyRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """启用双因素认证 (验证 6 位代码)"""
    if not current_user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先设置双因素认证"
        )

    # 验证 TOTP 代码
    if not verify_totp_code(current_user.two_factor_secret, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码不正确"
        )

    # 正式启用 2FA
    current_user.two_factor_enabled = True
    db.commit()

    return {"message": "双因素认证已启用", "two_factor_enabled": True}


@router.post("/me/two-factor/disable")
def disable_two_factor(
    request: TwoFactorDisableRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """禁用双因素认证"""
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="双因素认证未启用"
        )

    # 验证密码
    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密码不正确"
        )

    # 验证 TOTP 代码
    if not verify_totp_code(current_user.two_factor_secret, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码不正确"
        )

    # 禁用 2FA
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    db.commit()

    return {"message": "双因素认证已禁用", "two_factor_enabled": False}


@router.get("/me/security")
def get_security_info(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """获取当前用户的安全信息"""
    return {
        "username": current_user.username,
        "email": current_user.email,
        "two_factor_enabled": current_user.two_factor_enabled,
        "created_at": current_user.created_at,
    }
