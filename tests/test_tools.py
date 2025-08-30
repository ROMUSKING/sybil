import unittest
from unittest.mock import patch, MagicMock
import os
import json

from src.tools import read_file
from src.logger import logger

class TestTools(unittest.TestCase):

    def test_read_file_logs_correctly(self):
        # Create a dummy file to read
        dummy_filepath = "test_read_file.txt"
        with open(dummy_filepath, "w") as f:
            f.write("test content")

        # Use patch to replace the logger's info method with a mock
        with patch.object(logger, 'info', new_callable=MagicMock) as mock_logger_info:
            # Call the function
            read_file(dummy_filepath)

            # Assert that the logger was called
            mock_logger_info.assert_called_once()

            # Get the arguments from the call
            args, kwargs = mock_logger_info.call_args

            # Check the positional argument (the message)
            self.assertEqual(args[0], "Executing tool: read_file")

            # Check the keyword argument (the extra data)
            self.assertIn("extra", kwargs)
            self.assertEqual(kwargs["extra"], {"file_path": dummy_filepath})

        # Clean up the dummy file
        os.remove(dummy_filepath)

if __name__ == "__main__":
    unittest.main()
