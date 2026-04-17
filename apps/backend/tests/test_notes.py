"""
笔记 API 测试
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.note import Note, Tag, NoteTag
from app.models.user import User


@pytest.fixture
def sample_notes(db_session: Session, test_user: User) -> list:
    """创建测试笔记"""
    notes = []
    for i in range(3):
        note = Note(
            user_id=test_user.id,
            title=f"测试笔记 {i+1}",
            content=f"这是测试笔记 {i+1} 的内容",
            summary=f"摘要 {i+1}"
        )
        db_session.add(note)
        notes.append(note)
    db_session.commit()
    return notes


@pytest.fixture
def sample_tags(db_session: Session, test_user: User) -> list:
    """创建测试标签"""
    tags = []
    for name in ["工作", "学习", "生活"]:
        tag = Tag(
            user_id=test_user.id,
            name=name,
            color="#1890ff"
        )
        db_session.add(tag)
        tags.append(tag)
    db_session.commit()
    return tags


class TestNoteCRUD:
    """测试笔记 CRUD"""

    def test_create_note_success(self, client: TestClient, auth_headers: dict):
        """测试创建笔记成功"""
        response = client.post(
            "/api/notes/",
            headers=auth_headers,
            json={
                "title": "新笔记",
                "content": "笔记内容",
                "summary": "笔记摘要"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "新笔记"
        assert data["content"] == "笔记内容"
        assert data["summary"] == "笔记摘要"
        assert "id" in data

    def test_create_note_minimal(self, client: TestClient, auth_headers: dict):
        """测试最小内容创建笔记"""
        response = client.post(
            "/api/notes/",
            headers=auth_headers,
            json={
                "title": "只有标题的笔记"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "只有标题的笔记"
        assert data["content"] == ""

    def test_create_note_empty_title(self, client: TestClient, auth_headers: dict):
        """测试空标题 - API 接受空字符串并直接存储"""
        response = client.post(
            "/api/notes/",
            headers=auth_headers,
            json={
                "title": ""
            }
        )
        # API 接受空标题并存储为空字符串
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == ""

    def test_get_note_list(self, client: TestClient, auth_headers: dict, sample_notes: list):
        """测试获取笔记列表"""
        response = client.get("/api/notes/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == len(sample_notes)

    def test_get_note_list_pagination(self, client: TestClient, auth_headers: dict, sample_notes: list):
        """测试笔记列表分页"""
        response = client.get("/api/notes/?page=2&size=1", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["page"] == 2
        assert data["size"] == 1

    def test_get_note_detail(self, client: TestClient, auth_headers: dict, sample_notes: list):
        """测试获取笔记详情"""
        note = sample_notes[0]
        response = client.get(f"/api/notes/{note.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == note.id
        assert data["title"] == note.title

    def test_get_note_detail_not_found(self, client: TestClient, auth_headers: dict):
        """测试获取不存在的笔记"""
        response = client.get("/api/notes/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_get_note_detail_other_user(self, client: TestClient, auth_headers: dict, db_session: Session):
        """测试获取其他用户的笔记"""
        # 创建另一个用户及其笔记
        from app.models.user import User
        from app.utils.auth import get_password_hash
        other_user = User(
            username="other",
            email="other@example.com",
            password_hash=get_password_hash("pass")
        )
        db_session.add(other_user)
        db_session.flush()

        other_note = Note(
            user_id=other_user.id,
            title="别人的笔记",
            content="内容"
        )
        db_session.add(other_note)
        db_session.commit()

        response = client.get(f"/api/notes/{other_note.id}", headers=auth_headers)
        assert response.status_code == 404

    def test_update_note_success(self, client: TestClient, auth_headers: dict, sample_notes: list):
        """测试更新笔记"""
        note = sample_notes[0]
        response = client.put(
            f"/api/notes/{note.id}",
            headers=auth_headers,
            json={
                "title": "更新的标题",
                "content": "更新的内容"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "更新的标题"
        assert data["content"] == "更新的内容"

    def test_update_note_partial(self, client: TestClient, auth_headers: dict, sample_notes: list):
        """测试部分更新笔记"""
        note = sample_notes[0]
        original_content = note.content
        response = client.put(
            f"/api/notes/{note.id}",
            headers=auth_headers,
            json={
                "title": "只更新标题"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "只更新标题"
        assert data["content"] == original_content  # 内容不变

    def test_delete_note_success(self, client: TestClient, auth_headers: dict, sample_notes: list, db_session: Session):
        """测试删除笔记"""
        note = sample_notes[0]
        note_id = note.id
        response = client.delete(f"/api/notes/{note_id}", headers=auth_headers)
        assert response.status_code == 200

        # 验证数据库中已删除
        deleted_note = db_session.query(Note).filter_by(id=note_id).first()
        assert deleted_note is None

    def test_delete_note_not_found(self, client: TestClient, auth_headers: dict):
        """测试删除不存在的笔记"""
        response = client.delete("/api/notes/99999", headers=auth_headers)
        assert response.status_code == 404


class TestNoteTags:
    """测试笔记标签"""

    def test_create_tag_success(self, client: TestClient, auth_headers: dict):
        """测试创建标签"""
        response = client.post(
            "/api/notes/tags",
            headers=auth_headers,
            json={
                "name": "新标签",
                "color": "#ff0000"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "新标签"
        assert data["color"] == "#ff0000"

    def test_create_tag_duplicate(self, client: TestClient, auth_headers: dict, sample_tags: list):
        """测试创建重复标签"""
        tag = sample_tags[0]
        response = client.post(
            "/api/notes/tags",
            headers=auth_headers,
            json={
                "name": tag.name,
                "color": "#000000"
            }
        )
        assert response.status_code == 400

    def test_get_tags(self, client: TestClient, auth_headers: dict, sample_tags: list):
        """测试获取标签列表"""
        response = client.get("/api/notes/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == len(sample_tags)

    def test_delete_tag(self, client: TestClient, auth_headers: dict, sample_tags: list, db_session: Session):
        """测试删除标签"""
        tag = sample_tags[0]
        tag_id = tag.id
        response = client.delete(f"/api/notes/tags/{tag_id}", headers=auth_headers)
        assert response.status_code == 200

        # 验证已删除
        deleted_tag = db_session.query(Tag).filter_by(id=tag_id).first()
        assert deleted_tag is None

    def test_note_with_tags(self, client: TestClient, auth_headers: dict, sample_notes: list, sample_tags: list, db_session: Session):
        """测试笔记关联标签"""
        note = sample_notes[0]
        tag = sample_tags[0]

        # 使用 NoteTag 关联表来关联标签
        note_tag = NoteTag(note_id=note.id, tag_id=tag.id)
        db_session.add(note_tag)
        db_session.commit()

        # 获取笔记详情，应包含标签
        response = client.get(f"/api/notes/{note.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["tags"]) == 1
        assert data["tags"][0] == tag.name


class TestNoteUnauthorized:
    """测试未授权访问"""

    def test_create_note_unauthorized(self, client: TestClient):
        """测试未授权创建笔记"""
        response = client.post(
            "/api/notes/",
            json={"title": "笔记"}
        )
        assert response.status_code == 401

    def test_get_notes_unauthorized(self, client: TestClient):
        """测试未授权获取笔记列表"""
        response = client.get("/api/notes/")
        assert response.status_code == 401

    def test_update_note_unauthorized(self, client: TestClient):
        """测试未授权更新笔记"""
        response = client.put(
            "/api/notes/1",
            json={"title": "更新"}
        )
        assert response.status_code == 401
