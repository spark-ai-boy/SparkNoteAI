"""
认证 API 测试
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.auth import verify_password


class TestAuthRegister:
    """测试用户注册"""

    def test_register_success(self, client: TestClient, db_session: Session):
        """测试成功注册"""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "newpassword123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert "id" in data

        # 验证数据库中确实创建了用户
        user = db_session.query(User).filter_by(username="newuser").first()
        assert user is not None
        assert verify_password("newpassword123", user.password_hash)

    def test_register_duplicate_username(self, client: TestClient, test_user: User):
        """测试重复用户名注册失败"""
        response = client.post(
            "/api/auth/register",
            json={
                "username": test_user.username,
                "email": "another@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_duplicate_email(self, client: TestClient, test_user: User):
        """测试重复邮箱注册失败"""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "anotheruser",
                "email": test_user.email,
                "password": "password123"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_short_password(self, client: TestClient):
        """测试密码太短"""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "shortpass",
                "email": "short@example.com",
                "password": "123"
            }
        )
        assert response.status_code == 422

    def test_register_invalid_email(self, client: TestClient):
        """测试无效邮箱格式"""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "bademail",
                "email": "not-an-email",
                "password": "password123"
            }
        )
        assert response.status_code == 422


class TestAuthLogin:
    """测试用户登录"""

    def test_login_success(self, client: TestClient, test_user: User):
        """测试成功登录"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.username,
                "password": "testpassword"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, test_user: User):
        """测试密码错误"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user.username,
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client: TestClient):
        """测试不存在的用户"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": "nonexistent",
                "password": "password123"
            }
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()


class TestAuthMe:
    """测试获取/更新当前用户信息"""

    def test_get_me_success(self, client: TestClient, auth_headers: dict, test_user: User):
        """测试成功获取用户信息"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert data["id"] == test_user.id

    def test_get_me_unauthorized(self, client: TestClient):
        """测试未授权访问"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_me_invalid_token(self, client: TestClient):
        """测试无效 token"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

    def test_update_me_success(self, client: TestClient, auth_headers: dict, test_user: User):
        """测试成功更新用户信息"""
        response = client.put(
            "/api/auth/me",
            headers=auth_headers,
            json={
                "email": "updated@example.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "updated@example.com"
        assert data["username"] == test_user.username  # 用户名不应改变

    def test_update_me_duplicate_email(self, client: TestClient, auth_headers: dict, db_session: Session):
        """测试更新为已存在的邮箱"""
        # 创建另一个用户
        other_user = User(
            username="otheruser",
            email="other@example.com",
            password_hash="hashed",
            is_active=True
        )
        db_session.add(other_user)
        db_session.commit()

        response = client.put(
            "/api/auth/me",
            headers=auth_headers,
            json={
                "email": "other@example.com"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()


class TestAuthPassword:
    """测试密码修改"""

    def test_update_password_success(self, client: TestClient, auth_headers: dict, test_user: User, db_session: Session):
        """测试成功修改密码"""
        response = client.put(
            "/api/auth/me/password",
            headers=auth_headers,
            json={
                "current_password": "testpassword",
                "new_password": "newpassword456"
            }
        )
        assert response.status_code == 200

        # 验证新密码有效
        db_session.refresh(test_user)
        assert verify_password("newpassword456", test_user.password_hash)

    def test_update_password_wrong_old(self, client: TestClient, auth_headers: dict):
        """测试旧密码错误"""
        response = client.put(
            "/api/auth/me/password",
            headers=auth_headers,
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword456"
            }
        )
        assert response.status_code == 400
        assert "不正确" in response.json()["detail"]

    def test_update_password_short_new(self, client: TestClient, auth_headers: dict):
        """测试新密码太短"""
        response = client.put(
            "/api/auth/me/password",
            headers=auth_headers,
            json={
                "old_password": "testpassword",
                "new_password": "123"
            }
        )
        assert response.status_code == 422

    def test_update_password_unauthorized(self, client: TestClient):
        """测试未授权修改密码"""
        response = client.put(
            "/api/auth/me/password",
            json={
                "old_password": "oldpass",
                "new_password": "newpassword456"
            }
        )
        assert response.status_code == 401
