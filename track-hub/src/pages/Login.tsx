import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase';
import { Wallet, Mail, Lock, User, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { unverified?: boolean; email?: string } | null;
    if (state?.unverified) {
      setVerificationEmail(state.email || '');
      setNeedsVerification(true);
      signOut(auth);
      // Clear state to avoid persistent verification screen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          if (!userCredential.user.emailVerified) {
            await signOut(auth);
            setVerificationEmail(email);
            setNeedsVerification(true);
            return;
          }
        } catch (err: any) {
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            throw new Error('Email or password is incorrect');
          }
          throw err;
        }
      } else {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await sendEmailVerification(userCredential.user);
          await signOut(auth);
          setVerificationEmail(email);
          setNeedsVerification(true);
          return;
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            throw new Error('User already exists. Please sign in');
          }
          throw err;
        }
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (!result.user.emailVerified) {
        await signOut(auth);
        setVerificationEmail(result.user.email || '');
        setNeedsVerification(true);
        return;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-on-surface">Verify your email</h2>
            <p className="text-on-surface-variant text-sm">
              We have sent you a verification email to <span className="font-bold text-primary">{verificationEmail}</span>. Please verify it and log in.
            </p>
          </div>
          <button 
            onClick={() => setNeedsVerification(false)}
            className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20">
        <div className="p-8 bg-primary text-on-primary text-center">
          <div className="w-16 h-16 bg-on-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tighter">TRACK HUB</h1>
          <p className="text-on-primary/70 text-sm mt-2">Track Everything. Improve Anything.</p>
        </div>

        <div className="p-8">
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                    placeholder="John Doe"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-error text-xs font-medium">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-grow h-px bg-outline-variant/30"></div>
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Or continue with</span>
            <div className="flex-grow h-px bg-outline-variant/30"></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            className="w-full mt-6 py-3 border border-outline-variant/30 rounded-xl hover:bg-surface-container-low transition-all flex items-center justify-center gap-3 font-bold text-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
