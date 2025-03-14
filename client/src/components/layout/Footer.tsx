import { Link } from 'wouter';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-10 mt-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="text-blue-500 text-2xl font-bold mb-4">
              <i className="fas fa-heartbeat mr-2"></i>
              <span>FitAI</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              AI-powered health and fitness tracking to help you reach your goals with personalized insights.
            </p>
            <div className="flex space-x-4 text-xl">
              <a href="#" className="text-gray-400 hover:text-blue-500">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-500">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-500">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-500">
                <Youtube size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Features</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/" className="hover:text-blue-500">Activity Tracking</Link></li>
              <li><Link href="/workouts" className="hover:text-blue-500">Workout Library</Link></li>
              <li><Link href="/nutrition" className="hover:text-blue-500">Nutrition Planning</Link></li>
              <li><Link href="/insights" className="hover:text-blue-500">Sleep Analysis</Link></li>
              <li><Link href="/insights" className="hover:text-blue-500">AI Recommendations</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-blue-500">About Us</a></li>
              <li><a href="#" className="hover:text-blue-500">Careers</a></li>
              <li><a href="#" className="hover:text-blue-500">Blog</a></li>
              <li><a href="#" className="hover:text-blue-500">Press</a></li>
              <li><a href="#" className="hover:text-blue-500">Contact Us</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-blue-500">Help Center</a></li>
              <li><a href="#" className="hover:text-blue-500">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-500">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-500">Security</a></li>
              <li><a href="#" className="hover:text-blue-500">Cookie Settings</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} FitAI, Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
