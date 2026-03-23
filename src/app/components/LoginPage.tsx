import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Loader2, LogIn, Shield, User, Building2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<'super' | 'org' | 'user'>('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [clickSequence, setClickSequence] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting login with:', { username, loginType });
      await login(username, password, loginType, organizationCode);
      toast.success(`Welcome ${username}!`);
      
      // Navigate based on login type
      if (loginType === 'super') {
        navigate('/organizations');
      } else if (loginType === 'org') {
        navigate('/org-settings');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error details:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLetterClick = (letter: string) => {
    const newSequence = [...clickSequence, letter.toLowerCase()];
    
    // Check if the sequence matches 't', 'r', 'e'
    const targetSequence = ['t', 'r', 'e'];
    
    // Check if current sequence is on track
    let isValid = true;
    for (let i = 0; i < newSequence.length; i++) {
      if (newSequence[i] !== targetSequence[i]) {
        isValid = false;
        break;
      }
    }
    
    if (!isValid) {
      // Reset if wrong letter clicked
      setClickSequence([]);
      return;
    }
    
    setClickSequence(newSequence);
    
    // Check if complete sequence is entered
    if (newSequence.length === 3 && newSequence.join('') === 'tre') {
      setShowSuperAdmin(true);
      setClickSequence([]);
      toast.success('Super Admin mode unlocked', { duration: 2000 });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              <span 
                onClick={() => handleLetterClick('E')} 
                className="cursor-pointer hover:text-blue-600 transition-colors"
              >
                E
              </span>
              <span className="cursor-default">quip</span>
              <span 
                onClick={() => handleLetterClick('T')} 
                className="cursor-pointer hover:text-blue-600 transition-colors"
              >
                T
              </span>
              <span 
                onClick={() => handleLetterClick('R')} 
                className="cursor-pointer hover:text-blue-600 transition-colors"
              >
                r
              </span>
              <span className="cursor-default">ack</span>
            </h1>
            <p className="text-gray-600">Equipment Management System</p>
          </div>

          {/* Login Type Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setLoginType('user')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginType === 'user'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4 inline mr-1" />
              User
            </button>
            <button
              onClick={() => setLoginType('org')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginType === 'org'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-1" />
              Organization Admin
            </button>
            {showSuperAdmin && (
              <button
                onClick={() => setLoginType('super')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  loginType === 'super'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-1" />
                Super Admin
              </button>
            )}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {loginType === 'super' ? 'Username' : loginType === 'org' ? 'Organization Username' : 'Username'}
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  loginType === 'super' 
                    ? 'Enter super admin username' 
                    : loginType === 'org' 
                    ? 'Enter organization username' 
                    : 'Enter your username'
                }
                required
                autoComplete="username"
              />
            </div>

            {(loginType === 'super' || loginType === 'org') && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                />
              </div>
            )}

            {loginType === 'user' && (
              <div className="space-y-2">
                <Label htmlFor="organizationCode">Organization Code (3 letters)</Label>
                <Input
                  id="organizationCode"
                  type="text"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value)}
                  placeholder="e.g., ABC"
                  required
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  {loginType === 'super' ? 'Super Admin Login' : loginType === 'org' ? 'Organization Login' : 'User Login'}
                </>
              )}
            </Button>
          </form>

          {loginType === 'user' && (
            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have access? Contact your organization administrator.
            </p>
          )}
          {loginType === 'org' && (
            <p className="mt-6 text-center text-sm text-gray-600">
              Need to create an organization? Contact super admin.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Secure equipment management for contractors
        </p>
      </div>
    </div>
  );
}