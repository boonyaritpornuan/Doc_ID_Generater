import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { User } from '../types';

interface LoginProps {
    onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [error, setError] = useState<string | null>(null);

    const handleSuccess = (credentialResponse: CredentialResponse) => {
        if (credentialResponse.credential) {
            try {
                const decoded: any = jwtDecode(credentialResponse.credential);
                
                // Check if email domain is valid
                if (decoded.email && decoded.email.endsWith('@nhschool.ac.th')) {
                    const user: User = {
                        email: decoded.email,
                        name: decoded.name,
                        picture: decoded.picture
                    };
                    onLoginSuccess(user);
                } else {
                    setError('กรุณาใช้อีเมล @nhschool.ac.th เท่านั้น');
                }
            } catch (e) {
                console.error("Login Error:", e);
                setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            }
        }
    };

    const handleError = () => {
        setError('Login Failed');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-md text-center">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">เข้าสู่ระบบ</h1>
                <p className="mb-6 text-gray-600">ระบบออกเลขหนังสือราชการ</p>
                
                <div className="flex justify-center mb-4">
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={handleError}
                        useOneTap
                    />
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}
                
                <p className="mt-4 text-xs text-gray-500">
                    * เฉพาะบุคลากรที่ใช้อีเมล @nhschool.ac.th เท่านั้น
                </p>
            </div>
        </div>
    );
};

export default Login;
