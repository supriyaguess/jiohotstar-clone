import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineLock, AiOutlineUser } from 'react-icons/ai';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF } from 'react-icons/fa';
import { BsCheckCircleFill } from 'react-icons/bs';
import { useApp } from '../context/AppContext';
import { SUBSCRIPTION_PLANS } from '../constants';

export default function Signup() {
  const [step, setStep] = useState(1); // 1=plan, 2=form
  const [selectedPlan, setSelectedPlan] = useState(1); // index
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      login({ name, email, plan: SUBSCRIPTION_PLANS[selectedPlan].name });
      navigate('/');
      setLoading(false);
    }, 1200);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0533 50%, #0a1628 100%)',
      }}
    >
      {/* Bg blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-purple-900/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-blue-900/30 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <span className="text-3xl font-black tracking-tight">
              <span className="text-blue-400">jio</span>
              <span className="text-white">|</span>
              <span className="gradient-text">hotstar</span>
            </span>
          </Link>
        </div>

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-black text-white text-center mb-2">Choose Your Plan</h2>
            <p className="text-gray-400 text-sm text-center mb-8">Cancel anytime. No hidden charges.</p>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {SUBSCRIPTION_PLANS.map((plan, i) => (
                <div
                  key={plan.name}
                  onClick={() => setSelectedPlan(i)}
                  className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 ${
                    selectedPlan === i
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-black bg-yellow-400">
                      POPULAR
                    </div>
                  )}
                  <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-black text-white">{plan.price}</span>
                    <span className="text-gray-400 text-xs">{plan.period}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                        <BsCheckCircleFill size={12} className="text-purple-400 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {selectedPlan === i && (
                    <div className="absolute top-3 right-3">
                      <BsCheckCircleFill size={16} className="text-purple-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            >
              Continue with {SUBSCRIPTION_PLANS[selectedPlan].name} Plan →
            </button>
          </div>
        )}

        {/* Step 2: Account Form */}
        {step === 2 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in">
            <button
              onClick={() => setStep(1)}
              className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
            >
              ← Back to plans
            </button>

            <h2 className="text-xl font-black text-white mb-1">Create your account</h2>
            <p className="text-gray-400 text-sm mb-6">
              {SUBSCRIPTION_PLANS[selectedPlan].name} plan · {SUBSCRIPTION_PLANS[selectedPlan].price}{SUBSCRIPTION_PLANS[selectedPlan].period}
            </p>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors">
                <FcGoogle size={18} />
                Google
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 border border-blue-600/30 text-white text-sm hover:bg-blue-600/30 transition-colors">
                <FaFacebookF size={16} className="text-blue-400" />
                Facebook
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-xs">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="relative">
                <AiOutlineUser size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors text-sm"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <AiOutlineMail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors text-sm"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <AiOutlineLock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password (min. 6 chars)"
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Start Watching Now'
                )}
              </button>

              <p className="text-center text-gray-600 text-xs">
                By subscribing you agree to our{' '}
                <a href="#" className="text-gray-400 hover:text-white">Terms of Use</a>{' '}
                and{' '}
                <a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a>
              </p>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              Already a member?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
