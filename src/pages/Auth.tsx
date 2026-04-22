import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, BookOpen } from 'lucide-react';
import { z } from 'zod';

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn, signUp, isAuthenticated, loading } = useAuth();

  const emailSchema = z.string().email(t('auth.invalidEmail'));
  const passwordSchema = z.string().min(6, t('auth.passwordTooShort'));
  const displayNameSchema = z.string().min(2, t('auth.nameTooShort')).optional();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (!isLogin && displayName) {
      const displayNameResult = displayNameSchema.safeParse(displayName);
      if (!displayNameResult.success) {
        newErrors.displayName = displayNameResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error(t('auth.invalidCredentials'));
          } else if (error.message.includes('Email not confirmed')) {
            toast.error(t('auth.emailNotConfirmed'));
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success(t('auth.loginSuccess'));
        navigate('/');
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error(t('auth.emailUsed'));
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success(t('auth.accountCreated'));
      }
    } catch (error) {
      toast.error(t('auth.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pattern-islamic flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pattern-islamic">
      <Header showBackButton onBack={() => navigate('/')} />

      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? t('auth.login') : t('auth.signup')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? t('auth.loginAr') : t('auth.signupAr')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('auth.displayName')}
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t('auth.yourName')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={errors.displayName ? 'border-destructive' : ''}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('auth.email')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
              required
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('auth.password')}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                {isLogin ? t('auth.loggingIn') : t('auth.signingUp')}
              </span>
            ) : (
              isLogin ? t('auth.loginButton') : t('auth.signupButton')
            )}
          </Button>

          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? t('auth.createAccount') : t('auth.loginButton')}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('auth.hint')}
        </p>
      </main>
    </div>
  );
};

export default Auth;
