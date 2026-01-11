import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../services/supabase';
import { User, Settings as SettingsIcon, Shield, Bell } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const SettingsPage = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setFullName(user.user_metadata?.full_name || '');
                setEmail(user.email || '');
            }
        };
        loadUser();
    }, []);

    const handleUpdateProfile = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Profile updated successfully' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!password) return;
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto pb-10">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 mt-1">Manage your account and preferences.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {/* Profile Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <User size={20} />
                            </div>
                            <div>
                                <CardTitle>Profile Information</CardTitle>
                                <p className="text-sm text-slate-500">Update your account details and public profile.</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            label="Email Address"
                            value={email}
                            disabled
                            placeholder="your@email.com"
                        />
                        <Input
                            label="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                        />
                        <div className="flex justify-end pt-2">
                            <Button variant="primary" onClick={handleUpdateProfile} isLoading={loading}>
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Shield size={20} />
                            </div>
                            <div>
                                <CardTitle>Security</CardTitle>
                                <p className="text-sm text-slate-500">Manage your password and security settings.</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            label="New Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        <div className="flex justify-end pt-2">
                            <Button variant="secondary" onClick={handleUpdatePassword} isLoading={loading} disabled={!password}>
                                Update Password
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences Section */}
                <Card className="opacity-75">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <Bell size={20} />
                            </div>
                            <div>
                                <CardTitle>Preferences</CardTitle>
                                <p className="text-sm text-slate-500">Customize your application experience.</p>
                            </div>
                            <Badge variant="warning" className="ml-auto">Coming Soon</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pointer-events-none grayscale-[0.5]">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">Dark Mode</span>
                                <div className="h-6 w-11 bg-slate-200 rounded-full relative"><div className="h-4 w-4 bg-white rounded-full absolute left-1 top-1 shadow-sm" /></div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">Email Notifications</span>
                                <div className="h-6 w-11 bg-primary-200 rounded-full relative"><div className="h-4 w-4 bg-white rounded-full absolute right-1 top-1 shadow-sm" /></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
