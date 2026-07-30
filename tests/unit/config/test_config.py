import importlib
from unittest.mock import patch

import api.config


class TestConfig:
    @staticmethod
    def _reload_config():
        importlib.reload(api.config)

    @patch("dotenv.load_dotenv")
    @patch("os.getenv")
    def test_defaults(self, mock_getenv, mock_load_dotenv):
        mock_getenv.side_effect = lambda key, default=None: default
        self._reload_config()
        assert api.config.DB_USER == "postgres"
        assert api.config.DB_PASSWORD == "postgres"
        assert api.config.DB_HOST == "localhost"
        assert api.config.DB_PORT == 5432
        assert api.config.DB_NAME == "performancelab"

    @patch("dotenv.load_dotenv")
    @patch("os.getenv")
    def test_custom_values(self, mock_getenv, mock_load_dotenv):
        env = {
            "DB_USER": "admin",
            "DB_PASSWORD": "secret",
            "DB_HOST": "10.0.0.1",
            "DB_PORT": "6432",
            "DB_NAME": "mydb",
        }
        mock_getenv.side_effect = lambda key, default=None: env.get(key, default)
        self._reload_config()
        assert api.config.DB_USER == "admin"
        assert api.config.DB_PASSWORD == "secret"
        assert api.config.DB_HOST == "10.0.0.1"
        assert api.config.DB_PORT == 6432
        assert api.config.DB_NAME == "mydb"

    @patch("dotenv.load_dotenv")
    @patch("os.getenv")
    def test_partial_override(self, mock_getenv, mock_load_dotenv):
        mock_getenv.side_effect = lambda key, default=None: (
            "custom_db" if key == "DB_NAME" else default
        )
        self._reload_config()
        assert api.config.DB_NAME == "custom_db"
        assert api.config.DB_USER == "postgres"

    @patch("dotenv.load_dotenv")
    @patch("os.getenv")
    def test_port_is_int(self, mock_getenv, mock_load_dotenv):
        mock_getenv.side_effect = lambda key, default=None: default
        self._reload_config()
        assert isinstance(api.config.DB_PORT, int)

    @patch("dotenv.load_dotenv")
    def test_dotenv_loaded(self, mock_load_dotenv):
        self._reload_config()
        mock_load_dotenv.assert_called_once()
        _, kwargs = mock_load_dotenv.call_args
        assert str(kwargs["dotenv_path"]).endswith(".env")
        assert kwargs["override"] is True
