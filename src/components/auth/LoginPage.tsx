import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building, Mail, Shield } from 'lucide-react';
import { generateOTP, getUserRole, saveSession } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface LoginPageProps {
  onLogin: (email: string, role: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    // Generate OTP and show it on screen (mock behavior)
    const newOTP = generateOTP();
    setGeneratedOTP(newOTP);
    setStep('otp');
    setLoading(false);
    
    toast({
      title: "OTP Generated",
      description: `Your OTP is: ${newOTP}`,
      variant: "default"
    });
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    if (otp !== generatedOTP) {
      setError('Invalid OTP. Please check and try again.');
      return;
    }

    setLoading(true);
    
    try {
      const role = await getUserRole(email);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 hour session
      
      await saveSession({
        email,
        role,
        expiresAt: expiresAt.toISOString()
      });

      toast({
        title: "Login Successful",
        description: `Welcome back! Logged in as ${role}`,
        variant: "default"
      });

      onLogin(email, role);
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setGeneratedOTP('');
    setError('');
  };

  const handleResendOTP = () => {
    const newOTP = generateOTP();
    setGeneratedOTP(newOTP);
    setOtp('');
    setError('');
    
    toast({
      title: "New OTP Generated",
      description: `Your new OTP is: ${newOTP}`,
      variant: "default"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-2xl shadow-medium">
              <Building className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">PEL Workflow</h1>
          <p className="text-muted-foreground">Code Creation & Approval System</p>
        </div>

        <Card className="bg-gradient-card shadow-medium border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {step === 'email' ? 'Sign In' : 'Enter OTP'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'email' 
                ? 'Enter your email to receive an OTP' 
                : `We've sent an OTP to ${email}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Generating OTP...' : 'Generate OTP'}
                </Button>
              </form>
            ) : (
              <>
                {/* Display OTP prominently */}
                <div className="bg-primary-light border border-primary/20 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Shield className="h-5 w-5 text-primary mr-2" />
                    <span className="text-sm font-medium text-primary">Your OTP</span>
                  </div>
                  <div className="text-2xl font-bold text-primary tracking-widest">
                    {generatedOTP}
                  </div>
                  <p className="text-xs text-primary/70 mt-2">
                    Copy this code to the field below
                  </p>
                </div>

                <form onSubmit={handleOTPSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      className="text-center text-lg tracking-widest"
                      disabled={loading}
                      maxLength={6}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChangeEmail}
                      className="flex-1"
                      disabled={loading}
                    >
                      Change Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResendOTP}
                      className="flex-1"
                      disabled={loading}
                    >
                      Resend OTP
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>For demo purposes, OTP is displayed on screen</p>
          <p className="mt-1">Use any email - role will be auto-assigned</p>
        </div>
      </div>
    </div>
  );
}