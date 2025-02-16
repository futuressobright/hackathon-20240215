import React, { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sending magic link...');
    try {
      const response = await fetch('http://localhost:8001/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setStatus('Magic link would be sent! (Demo mode)');
    } catch (error) {
      setStatus('Error (Demo mode)');
    }
  };

  return (
    <div className="bg-white/20 backdrop-blur-lg p-8 rounded-xl shadow-lg text-center w-96">
      <h1 className="text-3xl font-extrabold text-white mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full p-3 rounded bg-white/10 text-white placeholder-gray-300 border border-white/20"
          required
        />
        <button type="submit" className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md">
          Send Magic Link
        </button>
      </form>
      {status && <p className="mt-4 text-sm text-white">{status}</p>}
    </div>
  );
};

export default Login;
