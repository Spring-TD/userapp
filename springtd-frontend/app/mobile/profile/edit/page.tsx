'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EditProfilePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: 'Adedayo Fad',
        email: 'adefad@gmail.com',
        phone: '+23470*******89'
    });

    const handleSave = () => {
        // Handle save logic
        router.back();
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <div className="p-6 pt-8 flex items-center gap-4 border-b border-gray-100">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
            </div>

            <div className="flex-1 p-6">
                {/* Profile Picture */}
                <div className="flex justify-center mb-8 mt-4">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                            <Pencil className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                        <Input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="h-14 bg-gray-50 border-none rounded-xl text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="h-14 bg-gray-50 border-none rounded-xl text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Phone number</label>
                        <Input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="h-14 bg-gray-50 border-none rounded-xl text-gray-900"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button - Fixed at bottom */}
            <div className="p-6 border-t border-gray-100">
                <Button
                    onClick={handleSave}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base"
                >
                    Save changes
                </Button>
            </div>
        </div>
    );
}
