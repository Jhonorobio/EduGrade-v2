import React from 'react';
import { LoginForm } from "../../components/login-form";
import { GraduationCap } from 'lucide-react';

interface LoginPageProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export default function Page({
  username,
  setUsername,
  password,
  setPassword,
  handleLogin,
  loading,
}: LoginPageProps) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center items-center gap-3 mb-6">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-neutral-800">EduGrade</span>
        </div>
        <LoginForm 
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          handleLogin={handleLogin}
          loading={loading}
        />
      </div>
    </div>
  )
}