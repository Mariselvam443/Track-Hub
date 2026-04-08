import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useAuth } from '../AuthContext';
import { handleFirestoreError, OperationType } from '../errorUtils';
import { User, Mail, Shield, Save, Camera, Image as ImageIcon } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [email] = useState(user?.email || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [bannerURL, setBannerURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBannerURL(docSnap.data().bannerURL || '');
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [user]);

  const handleFileUpload = async (file: File, type: 'photo' | 'banner') => {
    if (!user) return;
    const storageRef = ref(storage, `users/${user.uid}/${type}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await handleFileUpload(file, 'photo');
      if (url) {
        await updateProfile(user, { photoURL: url });
        await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
        setPhotoURL(url);
      }
    } catch (error) {
      alert("Error uploading photo");
    } finally {
      setLoading(false);
    }
  };

  const onBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await handleFileUpload(file, 'banner');
      if (url) {
        await setDoc(doc(db, 'users', user.uid), { bannerURL: url }, { merge: true });
        setBannerURL(url);
      }
    } catch (error) {
      alert("Error uploading banner");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccess(false);

    try {
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, 'users', user.uid), { 
        name,
        email: user.email,
        userId: user.uid
      }, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Operative Profile</h1>
        <p className="text-on-surface-variant mt-1">Manage your identity and system credentials.</p>
      </header>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <div 
          className="h-32 bg-primary relative group cursor-pointer overflow-hidden"
          onClick={() => document.getElementById('bannerInput')?.click()}
        >
          {bannerURL ? (
            <img src={bannerURL} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-primary/30">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <input 
            id="bannerInput"
            type="file" 
            accept="image/*" 
            onChange={onBannerChange}
            className="hidden"
          />
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-2xl bg-surface-container-lowest p-1 shadow-xl relative group/avatar">
              <div className="w-full h-full rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container text-3xl font-bold overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('photoInput')?.click();
                }}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-lg shadow-lg border border-outline-variant/20 text-primary hover:scale-110 transition-all"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input 
                id="photoInput"
                type="file" 
                accept="image/*" 
                onChange={onPhotoChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                <input 
                  type="email" 
                  value={email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl opacity-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">System ID</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                <input 
                  type="text" 
                  value={user?.uid}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl opacity-50 cursor-not-allowed font-mono text-xs"
                />
              </div>
            </div>

            {success && (
              <div className="p-3 bg-green-500/10 text-green-500 text-sm font-bold rounded-xl border border-green-500/20 text-center">
                Profile updated successfully.
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
        <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Security Protocol</h3>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Your data is encrypted and stored securely within the Precision Ledger infrastructure. 
          Two-factor authentication is recommended for all high-level operatives.
        </p>
      </div>
    </div>
  );
};

export default Profile;
