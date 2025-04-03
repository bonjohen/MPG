import unittest
from app import create_app, db
from app.models.user import User

class BasicTestCase(unittest.TestCase):
    def setUp(self):
        """Set up test environment"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        """Clean up test environment"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_home_page(self):
        """Test that home page loads correctly"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Motion Powered Games', response.data)

    def test_about_page(self):
        """Test that about page loads correctly"""
        response = self.client.get('/about')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'About Us', response.data)

    def test_user_model(self):
        """Test user model functionality"""
        # Create a test user
        user = User(username='testuser', email='test@example.com', password_hash='fakehash')
        db.session.add(user)
        db.session.commit()

        # Retrieve the user
        retrieved_user = User.query.filter_by(username='testuser').first()
        self.assertIsNotNone(retrieved_user)
        self.assertEqual(retrieved_user.email, 'test@example.com')

        # Test user properties
        self.assertEqual(retrieved_user.wins, 0)
        self.assertEqual(retrieved_user.total_matches, 0)
        self.assertEqual(retrieved_user.win_rate, 0)

if __name__ == '__main__':
    unittest.main()
