'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Smartphone, CreditCard, User, Shield, ChevronLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';

type Step = 'details' | 'otp' | 'success';

function validatePan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
}

function validateMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

export default function AuthPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [pan, setPan] = useState('');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2 state
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  // Resend timer
  const startTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const validateDetails = () => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Enter your full name';
    if (!validatePan(pan)) errs.pan = 'Enter valid PAN (e.g. ABCDE1234F)';
    if (!validateMobile(mobile)) errs.mobile = 'Enter valid 10-digit mobile number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateDetails()) return;
    setLoading(true);
    try {
      await authApi.sendOtp({ name: name.trim(), pan: pan.toUpperCase(), mobile });
      setStep('otp');
      startTimer();
      toast.success('OTP sent! (Demo OTP: 1234)');
    } catch (err) {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');

    // Auto-advance
    if (value && index < 3) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }

    // Auto-submit
    if (newOtp.every((d) => d !== '') && value) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleVerifyOtp = async (otpValue?: string) => {
    const code = otpValue || otp.join('');
    if (code.length !== 4) { setOtpError('Enter 4-digit OTP'); return; }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp({
        mobile,
        otp: code,
        pan: pan.toUpperCase(),
        name: name.trim(),
      });

      setAuth({
        token: res.token,
        user: res.user,
        isAuthenticated: true,
      });

      toast.success(`Welcome, ${res.user.name.split(' ')[0]}!`);
      setTimeout(() => router.push('/bureau'), 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid OTP';
      setOtpError(msg);
      setOtp(['', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-10"
          style={{ background: 'radial-gradient(ellipse at center, #25F0C0 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 justify-center mb-8"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-black"
            style={{ background: 'linear-gradient(135deg, #25F0C0, #2FAB8E)' }}
          >
            F∞
          </div>
          <div>
            <div className="font-bold text-white text-xl">FinBRE</div>
            <div className="text-[10px] text-muted tracking-widest uppercase">by Finfinity</div>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border p-8"
          style={{ background: 'rgba(12, 31, 26, 0.95)', backdropFilter: 'blur(20px)' }}
        >
          <AnimatePresence mode="wait">
            {/* ── Step 1: Details ─────────────────────────────────────────── */}
            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-2xl font-black text-white mb-1">Get Started</h1>
                <p className="text-sm text-muted mb-6">
                  Enter your details to analyze your loan portfolio
                </p>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setErrors({}); }}
                        placeholder="As per PAN card"
                        className={`w-full bg-faint border rounded-xl pl-10 pr-4 py-3 text-sm text-text focus:outline-none transition-all ${
                          errors.name ? 'border-red/50 focus:border-red/70' : 'border-border focus:border-mint/50'
                        }`}
                      />
                    </div>
                    {errors.name && <p className="text-xs text-red mt-1">{errors.name}</p>}
                  </div>

                  {/* PAN */}
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                      PAN Number
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        value={pan}
                        onChange={(e) => { setPan(e.target.value.toUpperCase()); setErrors({}); }}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className={`w-full bg-faint border rounded-xl pl-10 pr-4 py-3 text-sm text-text font-mono tracking-widest uppercase focus:outline-none transition-all ${
                          errors.pan ? 'border-red/50 focus:border-red/70' : 'border-border focus:border-mint/50'
                        }`}
                      />
                    </div>
                    {errors.pan && <p className="text-xs text-red mt-1">{errors.pan}</p>}
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted font-medium">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors({}); }}
                        placeholder="9876543210"
                        maxLength={10}
                        className={`w-full bg-faint border rounded-xl pl-12 pr-4 py-3 text-sm text-text tracking-wider focus:outline-none transition-all ${
                          errors.mobile ? 'border-red/50 focus:border-red/70' : 'border-border focus:border-mint/50'
                        }`}
                      />
                    </div>
                    {errors.mobile && <p className="text-xs text-red mt-1">{errors.mobile}</p>}
                  </div>

                  <Button
                    variant="primary"
                    size="full"
                    loading={loading}
                    onClick={handleSendOtp}
                    className="mt-2"
                  >
                    Send OTP
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-6 flex items-start gap-2 text-xs text-muted">
                  <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal" />
                  <p>
                    Your PAN is used only to fetch your bureau report. We never store sensitive financial data.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: OTP ─────────────────────────────────────────────── */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => setStep('details')}
                  className="flex items-center gap-1.5 text-muted hover:text-text text-xs mb-5 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(37,240,192,0.1)' }}
                >
                  <Smartphone className="w-6 h-6 text-mint" />
                </div>

                <h2 className="text-2xl font-black text-white mb-1">Verify OTP</h2>
                <p className="text-sm text-muted mb-6">
                  Enter the 4-digit OTP sent to{' '}
                  <span className="text-text font-medium">+91 {mobile}</span>
                  <br />
                  <span className="text-xs text-amber">Demo OTP: 1234</span>
                </p>

                {/* OTP inputs */}
                <div className="flex gap-3 justify-center mb-4">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-14 h-16 text-center text-2xl font-bold border rounded-2xl bg-faint text-text focus:outline-none transition-all ${
                        otpError
                          ? 'border-red/50 focus:border-red'
                          : digit
                          ? 'border-mint/60 text-mint shadow-mint-glow'
                          : 'border-border focus:border-mint/50'
                      }`}
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="text-center text-xs text-red mb-3">{otpError}</p>
                )}

                <Button
                  variant="primary"
                  size="full"
                  loading={loading}
                  onClick={() => handleVerifyOtp()}
                  disabled={otp.some((d) => !d)}
                >
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Resend */}
                <div className="text-center mt-4">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-muted">
                      Resend in <span className="text-mint">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        handleSendOtp();
                        startTimer();
                      }}
                      className="text-xs text-mint hover:underline flex items-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Resend OTP
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6 mt-8"
        >
          {['RBI Compliant', '256-bit Encrypted', 'No Spam'].map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-xs text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-teal" />
              {item}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
