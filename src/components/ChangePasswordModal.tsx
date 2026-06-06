import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Lock, X, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ActivityLogger } from '../utils/activityDB';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
}

export function ChangePasswordModal({ isOpen, onClose, currentUser }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const trimCurrent = currentPassword.trim();
    const trimNew = newPassword.trim();
    const trimConfirm = confirmPassword.trim();

    if (!trimCurrent || !trimNew || !trimConfirm) {
      setErrorMsg('All fields are required.');
      setIsSubmitting(false);
      return;
    }

    if (trimNew.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    if (trimNew !== trimConfirm) {
      setErrorMsg('Confirm password does not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (currentUser === 'admin') {
        // 1. Verify current admin password
        let storedAdminPass = 'Anonymous#8856';
        const { data: dbSetting, error: dbErr } = await supabase
          .from('global_settings')
          .select('value')
          .eq('key', 'admin_password')
          .single();
        
        if (!dbErr && dbSetting && dbSetting.value) {
          storedAdminPass = dbSetting.value;
        }

        if (trimCurrent !== storedAdminPass) {
          setErrorMsg('Current admin password is incorrect.');
          setIsSubmitting(false);
          return;
        }

        // 2. Perform the update
        const { error: upsertErr } = await supabase
          .from('global_settings')
          .upsert([{ key: 'admin_password', value: trimNew }]);

        if (upsertErr) {
          throw upsertErr;
        }

        ActivityLogger.logActivity('password_changed', 'Admin successfully changed their master portal entrance password');
        setSuccessMsg('Master admin password updated successfully! Please keep this safe.');
      } else {
        // 1. Verify current password for operator user
        const email = currentUser.includes('@') ? currentUser : `${currentUser}@example.com`;
        
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: trimCurrent,
        });

        if (signInErr) {
          setErrorMsg('Current password is incorrect.');
          setIsSubmitting(false);
          return;
        }

        // 2. Update to new password
        const { error: updateErr } = await supabase.auth.updateUser({
          password: trimNew,
        });

        if (updateErr) {
          throw updateErr;
        }

        ActivityLogger.logActivity('password_changed', `Operator user "${currentUser}" changed their password`);
        setSuccessMsg('Your security credentials have been updated successfully.');
      }

      // Reset values
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating the password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden animate-zoom-in">
        {/* Glowing atmospheric details */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />

        {/* Title area */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Change Credentials</h3>
              <p className="text-[10px] text-slate-400 font-medium">Update account security password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 animate-fade-in font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 animate-fade-in flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-450 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-505 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-450 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-450 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype new password"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-4 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 hover:shadow-indigo-500/10 font-bold text-white rounded-xl transition-all uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
