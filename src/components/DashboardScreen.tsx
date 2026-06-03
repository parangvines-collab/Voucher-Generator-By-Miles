import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
import { 
  generateVoucherCode, 
  generateMikroTikScript, 
  exportToCSVContent, 
  generatePortalKeyFromSerial,
  formatTimeForDisplay
} from '../utils/voucherHelpers';
import { ActivityLogger } from '../utils/activityDB';
import { Voucher, VoucherTemplate, CashInRequest, PortalKeyRecord, PromoHistoryItem, VoucherBatch } from '../types';
import { VoucherCardList } from './VoucherCardList';
import { 
  PiggyBank, ArrowDownCircle, BadgeAlert, KeyRound, Ticket, 
  Layers, Settings2, ShieldCheck, Download, Code, FileText, ClipboardCopy, Copy, Check, RefreshCw,
  Smartphone, ExternalLink, History, Trash2, Calendar
} from 'lucide-react';

interface DashboardScreenProps {
  currentUser: string;
  onUpdateBalance?: () => void;
}

export function DashboardScreen({ currentUser, onUpdateBalance }: DashboardScreenProps) {
  // User balance states
  const [balance, setBalance] = useState(0);
  const [expiration, setExpiration] = useState('');
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0);

  // Cards show/hide states
  const [showPromo, setShowPromo] = useState(false);
  const [showCashIn, setShowCashIn] = useState(false);
  const [showPortalKeys, setShowPortalKeys] = useState(false);

  // Pricing
  const [promoPrice, setPromoPrice] = useState(30);
  const [portalKeyPrice, setPortalKeyPrice] = useState(50);
  const [portalKeyFirstPrice, setPortalKeyFirstPrice] = useState(300);
  const [portalKeySubsequentPrice, setPortalKeySubsequentPrice] = useState(150);
  const [juanfiLink, setJuanfiLink] = useState('/Enhanced%20JuanFi%20Portal%20ver.5.0%20(16.8kb).zip');
  const [juanfiTitle, setJuanfiTitle] = useState('𝐄𝐧𝐡𝐚𝐧𝐜𝐞𝐝 𝐉𝐮𝐚𝐧𝐅𝐢 𝐏𝐨𝐫𝐭𝐚𝐥 𝐯𝐞𝐫.𝟓.𝟎 (𝟏𝟔.𝟖𝐤𝐛)');
  const [juanfiDescription, setJuanfiDescription] = useState('“𝐋𝐢𝐠𝐡𝐭𝐰𝐞𝐢𝐠𝐡𝐭, 𝐬𝐦𝐨𝐨𝐭𝐡, 𝐚𝐧𝐝 𝐟𝐚𝐬𝐭-𝐥𝐨𝐚𝐝𝐢𝐧𝐠-𝐨𝐩𝐭𝐢𝐦𝐢𝐳𝐞𝐝 𝐚𝐭 𝐨𝐧𝐥𝐲 𝟏𝟔.𝟖𝐤𝐛 𝐟𝐨𝐫 𝐭𝐡𝐞 𝐛𝐞𝐬𝐭 𝐮𝐬𝐞𝐫 𝐞𝐱𝐩𝐞𝐫𝐢𝐞𝐧𝐜𝐞”');
  const [juanfiPassword, setJuanfiPassword] = useState('juanfi123');

  // Submissions
  const [cashInRef, setCashInRef] = useState('');
  const [cashInAmount, setCashInAmount] = useState(30);
  const [cashInSuccess, setCashInSuccess] = useState('');
  const [cashInError, setCashInError] = useState('');

  // PortalKey Buy states
  const [portalKeySerial, setPortalKeySerial] = useState('');
  const [portalKeySuccess, setPortalKeySuccess] = useState('');
  const [portalKeyError, setPortalKeyError] = useState('');

  // Lists corresponding specifically to the logged-in user
  const [userRequests, setUserRequests] = useState<CashInRequest[]>([]);
  const [userPortalKeys, setUserPortalKeys] = useState<PortalKeyRecord[]>([]);
  const [userPromoHistory, setUserPromoHistory] = useState<PromoHistoryItem[]>([]);

  // Generator Form Specs
  const [prefix, setPrefix] = useState('VC');
  const [charLength, setCharLength] = useState(6);
  const [voucherAmount, setVoucherAmount] = useState(5);
  const [quantity, setQuantity] = useState(5);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [validityMinutes, setValidityMinutes] = useState(60);
  const [userProfile, setUserProfile] = useState('');
  const [template, setTemplate] = useState<VoucherTemplate>('template1');
  const [hotspotName, setHotspotName] = useState('MikroTik Hotspot');

  // Generator output and notifications
  const [generatedVouchers, setGeneratedVouchers] = useState<Voucher[]>([]);
  const [isExportActive, setIsExportActive] = useState(false);
  const [copiedCodesSuccess, setCopiedCodesSuccess] = useState(false);
  const [copiedScriptSuccess, setCopiedScriptSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Voucher history states for tracking previously generated batches
  const [outputTab, setOutputTab] = useState<'live' | 'history'>('live');
  const [voucherHistory, setVoucherHistory] = useState<VoucherBatch[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Dialog (Alert, Confirm, Prompt) custom state to bypass blocked native popups in sandbox iframes
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    inputValue: string;
    showInput: boolean;
    inputPlaceholder: string;
    confirmText: string;
    cancelText: string;
    onConfirm: (val: string) => void;
    onCancel?: () => void;
    inputType?: string;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    inputValue: '',
    showInput: false,
    inputPlaceholder: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        type: 'alert',
        title,
        message,
        inputValue: '',
        showInput: false,
        inputPlaceholder: '',
        confirmText: 'OK',
        cancelText: '',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  };

  const showConfirm = (title: string, message: string, confirmText = 'Confirm', cancelText = 'Cancel'): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        inputValue: '',
        showInput: false,
        inputPlaceholder: '',
        confirmText,
        cancelText,
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const showPrompt = (title: string, message: string, defaultValue = '', placeholder = '', confirmText = 'Save', cancelText = 'Cancel', inputType = 'text'): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        inputValue: defaultValue,
        showInput: true,
        inputPlaceholder: placeholder,
        confirmText,
        cancelText,
        inputType,
        onConfirm: (val) => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(val);
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  };

  // Setup mount load and refresh polling
  useEffect(() => {
    loadUserMetadata();
    loadVoucherHistory();

    // Interval to dynamically poll user status and GCash tickets
    const interval = setInterval(() => {
      loadUserMetadata();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const loadUserMetadata = async () => {
    // Set prices
    let fbPromoPrice = 30;
    let fbPortalKeyPrice = 50;
    let fbPortalKeyFirstPrice = 300;
    let fbPortalKeySubsequentPrice = 150;
    let fbJuanfiLink = '/Enhanced%20JuanFi%20Portal%20ver.5.0%20(16.8kb).zip';
    let fbJuanfiTitle = '𝐄𝐧𝐡𝐚𝐧𝐜𝐞𝐝 𝐉𝐮𝐚𝐧𝐅𝐢 𝐏𝐫𝐭𝐚𝐥 𝐯𝐞𝐫.𝟓.𝟎 (𝟏𝟔.𝟖𝐤𝐛)';
    let fbJuanfiDesc = '“𝐋𝐢𝐠𝐡𝐭𝐰𝐞𝐢𝐠𝐡𝐭, 𝐬𝐦𝐨𝐨𝐭𝐡, 𝐚𝐧𝐝 𝐟𝐚𝐬𝐭-𝐥𝐨𝐚𝐝𝐢𝐧𝐠-𝐨𝐩𝐭𝐢𝐦𝐢𝐳𝐞𝐝 𝐚𝐭 𝐨𝐧𝐥𝐲 𝟏𝟔.𝟖𝐤𝐛 𝐟𝐨𝐫 𝐭𝐡𝐞 𝐛𝐞𝐬𝐭 𝐮𝐬𝐞𝐫 𝐞𝐱𝐩𝐞𝐫𝐢𝐞𝐧𝐜𝐞”';
    let fbJuanfiPassword = 'juanfi123';

    try {
      // 1. Fetch Global Setting Prices
      const { data: globalSettings } = await supabase.from('global_settings').select('*');
      if (globalSettings && globalSettings.length > 0) {
        globalSettings.forEach((s: any) => {
          if (s.key === 'promo_price') fbPromoPrice = parseInt(s.value) || 30;
          if (s.key === 'portal_key_price') fbPortalKeyPrice = parseInt(s.value) || 50;
          if (s.key === 'portal_key_first_price') fbPortalKeyFirstPrice = parseInt(s.value) || 300;
          if (s.key === 'portal_key_subsequent_price') fbPortalKeySubsequentPrice = parseInt(s.value) || 150;
          if (s.key === 'juanfi_link') fbJuanfiLink = s.value || '/Enhanced%20JuanFi%20Portal%20ver.5.0%20(16.8kb).zip';
          if (s.key === 'juanfi_title') fbJuanfiTitle = s.value || '𝐄𝐧𝐡𝐚𝐧𝐜𝐞𝐝 𝐉𝐮𝐚𝐧𝐅𝐢 𝐏𝐫𝐭𝐚𝐥 𝐯𝐞𝐫.𝟓.𝟎 (𝟏𝟔.𝟖𝐤𝐛)';
          if (s.key === 'juanfi_description') fbJuanfiDesc = s.value || '“𝐋𝐢𝐠𝐡𝐭𝐰𝐞𝐢𝐠𝐡𝐭, 𝐬𝐦𝐨𝐨𝐭𝐡, 𝐚𝐧𝐝 𝐟𝐚𝐬𝐭-𝐥𝐨𝐚𝐝𝐢𝐧𝐠-𝐨𝐩𝐭𝐢𝐦𝐢𝐳𝐞𝐝 𝐚𝐭 𝐨𝐧𝐥𝐲 𝟏𝟔.𝟖𝐤𝐛 𝐟𝐨𝐫 𝐭𝐡𝐞 𝐛𝐞𝐬𝐭 𝐮𝐬𝐞𝐫 𝐞𝐱𝐩𝐞𝐫𝐢𝐞𝐧𝐜𝐞”';
          if (s.key === 'juanfi_password') fbJuanfiPassword = s.value || 'juanfi123';
        });
      }
    } catch (e) {}

    setPromoPrice(fbPromoPrice);
    setPortalKeyPrice(fbPortalKeyPrice);
    setPortalKeyFirstPrice(fbPortalKeyFirstPrice);
    setPortalKeySubsequentPrice(fbPortalKeySubsequentPrice);
    setJuanfiLink(fbJuanfiLink);
    setJuanfiTitle(fbJuanfiTitle);
    setJuanfiDescription(fbJuanfiDesc);
    setJuanfiPassword(fbJuanfiPassword);

    if (currentUser === 'admin') {
      setIsAccessGranted(true);
      setIsExpired(false);
      setRemainingDays(999);
      setBalance(99999);
    } else {
      // Operator load
      let sbBalance = 0;
      let sbExpiration = '';

      try {
        // Fetch real profile from Supabase
        const { data: prof, error: errProf } = await supabase.from('profiles').select('*').eq('username', currentUser).single();
        if (!errProf && prof) {
          sbBalance = parseFloat(prof.balance) || 0;
          sbExpiration = prof.expiration || '';
        }
      } catch (err) {}

      setBalance(sbBalance);
      setExpiration(sbExpiration);

      // Propagate the updated balance info back to main Header
      onUpdateBalance?.();

      if (!sbExpiration) {
        setIsAccessGranted(false);
        setIsExpired(false);
      } else {
        const expDate = new Date(sbExpiration);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (expDate < today) {
          setIsExpired(true);
          setIsAccessGranted(false);
        } else {
          setIsAccessGranted(true);
          setIsExpired(false);
          const diffTime = expDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setRemainingDays(diffDays);
        }
      }
    }

    // Load Lists specific to the operator
    try {
      // 1. User GCash cash-in requests
      const { data: requests, error: errReq } = await supabase.from('cash_in_requests').select('*').eq('username', currentUser).order('date', { ascending: false });
      if (!errReq && requests) {
        const mappedCir: CashInRequest[] = requests.map((c: any) => ({
          username: c.username,
          refNumber: c.ref_number,
          amount: parseFloat(c.amount) || 0,
          status: c.status,
          date: c.date,
          approvedAmount: c.approved_amount ? parseFloat(c.approved_amount) : undefined
        }));
        setUserRequests(mappedCir);
      }

      // 2. User purchased device license keys
      const { data: keys, error: errKeys } = await supabase.from('portal_keys').select('*').eq('username', currentUser).order('date', { ascending: false });
      if (!errKeys && keys) {
        const mappedKeys = keys.map((p: any) => ({
          id: p.id,
          code: p.portal_key || p.key,
          serial: p.serial_number,
          date: p.date
        }));
        setUserPortalKeys(mappedKeys);
      }

      // 3. User promo pricing checkout logs
      const { data: promos, error: errProms } = await supabase.from('promo_history').select('*').eq('username', currentUser).order('date', { ascending: false });
      if (!errProms && promos) {
        const mappedProms: PromoHistoryItem[] = promos.map((p: any) => ({
          username: p.username,
          price: parseFloat(p.price) || 0,
          date: p.date
        }));
        setUserPromoHistory(mappedProms);
      }

    } catch (e) {
      console.warn('Bypassing online fetch lists for operator:', e);
    }
  };

  const handleToggleCard = (cardKey: string, currentVal: boolean, setValFn: (v: boolean) => void) => {
    const newVal = !currentVal;
    setValFn(newVal);
  };

  const handleActivateGeneratorClick = async () => {
    const freshPromoPrice = promoPrice;
    
    // We try to pull live profile info first to have the latest balance
    let freshBalance = balance;
    try {
      const { data } = await supabase.from('profiles').select('balance').eq('username', currentUser).single();
      if (data) {
        freshBalance = parseFloat(data.balance) || 0;
        setBalance(freshBalance);
      }
    } catch (er) {}

    if (freshBalance >= freshPromoPrice) {
      const confirmBuy = await showConfirm(
        'Activate License',
        `You currently have PHP ${freshBalance} balance available. Would you like to use PHP ${freshPromoPrice} to activate your 1-Month Voucher Generator license immediately?`,
        'Yes, Activate',
        'Cancel'
      );
      if (confirmBuy) {
        await handleBuyPromo();
      }
    } else {
      await showAlert(
        'Insufficient Balance',
        `Insufficient balance. You have PHP ${freshBalance} but require PHP ${freshPromoPrice} to buy 1-Month generator lease access.\n\nOpening the GCash Cash-In deposit block below so you can top up your operator account balance.`
      );
      // Automatically expand and show Cash-In card and form so they can top up!
      setShowCashIn(true);
      
      // Smooth scroll to Cash-In section
      setTimeout(() => {
        const cashInSection = document.getElementById('cash-in-card');
        if (cashInSection) {
          cashInSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Buy rent access (1 month)
  const handleBuyPromo = async () => {
    // Dynamic settings retrieve
    let finalPromoPrice = promoPrice;
    try {
      const { data } = await supabase.from('global_settings').select('value').eq('key', 'promo_price').single();
      if (data && data.value) finalPromoPrice = parseInt(data.value) || promoPrice;
    } catch (e) {}

    // 1. Subtract balance in Supabase profiles
    let targetProfileId = null;
    let oldBalance = balance;
    let oldExpiration = expiration;
    try {
      const { data: prof, error } = await supabase.from('profiles').select('id, balance, expiration').eq('username', currentUser).single();
      if (!error && prof) {
        targetProfileId = prof.id;
        oldBalance = parseFloat(prof.balance) || 0;
        oldExpiration = prof.expiration || '';
      }
    } catch (e) {
      console.error('Failed to fetch profile for promo purchase:', e);
    }

    if (oldBalance < finalPromoPrice) {
      await showAlert(
        'Insufficient Balance',
        `Insufficient balance. You need ${finalPromoPrice} PHP to buy Voucher Generator access. Please cash-in to top up.`
      );
      return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    
    let expDate = (oldExpiration && new Date(oldExpiration) >= today) ? new Date(oldExpiration) : new Date(today);
    expDate.setMonth(expDate.getMonth() + 1);
    const newExpStr = expDate.toISOString().split('T')[0];

    const finalBalance = oldBalance - finalPromoPrice;

    // 2. Perform updates inside profiles
    if (targetProfileId) {
      try {
        await supabase.from('profiles').update({
          balance: finalBalance,
          expiration: newExpStr
        }).eq('id', targetProfileId);
      } catch (e) {
        console.error('Failed to update profile after promo purchase:', e);
        // We'll still continue since we have local storage fallback
      }
    }

    // 3. Insert subscription history inside promo_history
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || null;
      const { error: insertErr } = await supabase.from('promo_history').insert([{
        user_id: userId,
        username: currentUser,
        price: finalPromoPrice,
        date: new Date().toISOString(),
        promo_name: '1-Month Activation',
        duration_days: 30
      }]);
      if (insertErr) {
        console.error('Failed to insert promo history into Supabase:', insertErr);
      }
    } catch (e) {
      console.error('Failed to insert promo history into Supabase:', e);
    }



    ActivityLogger.logActivity('promo_purchased', `Purchased 1-Month generator license activation`, { price: finalPromoPrice });
    
    await showAlert(
      'Congratulations!',
      'Rent access purchased successfully! 1 Month has been activated on your operator layout.'
    );
    
    await loadUserMetadata();
    onUpdateBalance?.();
  };

  // Cash In GCash
  const handleCashInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashInSuccess('');
    setCashInError('');

    const ref = cashInRef.trim();
    if (!ref) {
      setCashInError('GCash Transaction ID is mandatory.');
      return;
    }

    if (cashInAmount <= 0) {
      setCashInError('Amount must be positive.');
      return;
    }

    // Check unique reference locally/online to avoid duplicate submits
    let isDuplicated = false;
    try {
      const { data, error: selectErr } = await supabase.from('cash_in_requests').select('ref_number').eq('ref_number', ref);
      if (selectErr) {
        console.error('Error checking duplicate cash-in reference:', selectErr);
      }
      if (data && data.length > 0) isDuplicated = true;
    } catch (e) {
      console.error('Exception checking duplicate:', e);
    }

    if (isDuplicated) {
      setCashInError('GCash reference ID has already been logged.');
      return;
    }

    // 1. Log request to database in cash_in_requests
    let supabaseSuccess = false;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || null;
      
      const { error: insertErr } = await supabase.from('cash_in_requests').insert([{
        user_id: userId,
        username: currentUser,
        ref_number: ref,
        amount: cashInAmount,
        status: 'pending',
        date: new Date().toISOString()
      }]);

      if (insertErr) {
        console.error('Supabase cash_in_requests insertion failed status info:', insertErr);
        setCashInError(`Supabase Error: ${insertErr.message}. Ensure your database table 'cash_in_requests' exists and security rules permit insertions.`);
        return;
      } else {
        supabaseSuccess = true;
      }
    } catch (er: any) {
      console.error('Logging online cash-in request exception thrown:', er);
      setCashInError(`Network Error: ${er.message || er}`);
      return;
    }



     // Send Telegram Notification
     await sendTelegramNotification(currentUser, ref, cashInAmount);

    ActivityLogger.logActivity('cash_in_requested', `Submitted billing deposit load ticket`, { refNumber: ref, amount: cashInAmount });

    setCashInSuccess('Deposit ticket successfully logged! Pending admin validation details review.');
    setCashInRef('');
    await loadUserMetadata();
  };

    const sendTelegramNotification = async (uName: string, ref: string, amt: number) => {
        let token = '';
        let chat = '';
        try {
          const { data: settings } = await supabase.from('global_settings').select('*');
          if (settings) {
            settings.forEach((s: any) => {
              if (s.key === 'telegram_bot_token') token = s.value;
              if (s.key === 'telegram_chat_id') chat = s.value;
            });
          }
        } catch(e) {}
        
        if (!token || !chat) {
            console.warn('Telegram credentials not configured');
            return;
        }

        const text = `🔔 Cash-In Request Submitted\nUser Operator: ${uName}\nGCash Ref: ${ref}\nAmount PHP: ${amt} pesos`;
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chat,
                    text: text,
                    parse_mode: 'HTML'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Telegram API error: ${response.status}`);
            }
            
            const result = await response.json();
            if (!result.ok) {
                throw new Error(`Telegram API error: ${result.description}`);
            }
            
            console.log('Telegram notification sent successfully');
        } catch (error) {
            console.error('Failed to send Telegram notification:', error);
            // Optionally, you could implement a retry mechanism here
        }
    };

  const handleProtectedDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const inputPass = await showPrompt(
      'Download Verification',
      'Please enter any of the Portal Keys you purchased to download the Enhanced JuanFi Portal archive:',
      '',
      '66QQA-A2UII-U6AI6-2MUIQ',
      'Verify & Download',
      'Cancel',
      'text'
    );
    if (inputPass === null) return;
    
    const keyTrimmed = inputPass.trim();
    if (!keyTrimmed) {
      await showAlert('Invalid Key', 'Verification Key cannot be empty.');
      return;
    }

    try {
      // Check if entering a portal_key from the database table (generated key vault)
      const { data, error } = await supabase
        .from('portal_keys')
        .select('*')
        .eq('portal_key', keyTrimmed);

      const isKeyValid = !error && data && data.length > 0;

      if (isKeyValid) {
        // Correct activation key! Trigger browser download
        const downloadLink = document.createElement('a');
        downloadLink.href = juanfiLink;
        downloadLink.download = 'Enhanced JuanFi Portal ver.5.0 (16.8kb).zip';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        ActivityLogger.logActivity('juanfi_download', `Downloaded Enhanced JuanFi Portal using activation key verification`);
      } else {
        // Fallback check against local state userPortalKeys just in case
        const isLocalKeyValid = userPortalKeys.some(k => k.code === keyTrimmed);
        if (isLocalKeyValid) {
          const downloadLink = document.createElement('a');
          downloadLink.href = juanfiLink;
          downloadLink.download = 'Enhanced JuanFi Portal ver.5.0 (16.8kb).zip';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          ActivityLogger.logActivity('juanfi_download', `Downloaded Enhanced JuanFi Portal using local validation key`);
        } else if (keyTrimmed === juanfiPassword) {
          // Keep the admin/global juanfiPassword as a root fallback/developer master key
          const downloadLink = document.createElement('a');
          downloadLink.href = juanfiLink;
          downloadLink.download = 'Enhanced JuanFi Portal ver.5.0 (16.8kb).zip';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } else {
          await showAlert('Incorrect Key', 'The Activation Key you entered is invalid or does not exist in the Key Vault. Please purchase an Activation Key first.');
        }
      }
    } catch (err) {
      const isLocalKeyValid = userPortalKeys.some(k => k.code === keyTrimmed);
      if (isLocalKeyValid || keyTrimmed === juanfiPassword) {
        const downloadLink = document.createElement('a');
        downloadLink.href = juanfiLink;
        downloadLink.download = 'Enhanced JuanFi Portal ver.5.0 (16.8kb).zip';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        await showAlert('Verification Error', 'Failed to verify key. Please enter a valid Activation Key.');
      }
    }
  };

  // Buy Activation Key (PortalKey)
  const handleBuyPortalKey = async () => {
    // Determine the price dynamically based on first-time or subsequent purchases
    let finalKeyPrice = portalKeyFirstPrice;
    try {
      const { data: keys, error } = await supabase.from('portal_keys').select('id').eq('username', currentUser);
      if (!error && keys && keys.length > 0) {
        finalKeyPrice = portalKeySubsequentPrice;
      } else {
        const hasLicense = userPortalKeys && userPortalKeys.length > 0;
        finalKeyPrice = hasLicense ? portalKeySubsequentPrice : portalKeyFirstPrice;
      }
    } catch (e) {
      const hasLicense = userPortalKeys && userPortalKeys.length > 0;
      finalKeyPrice = hasLicense ? portalKeySubsequentPrice : portalKeyFirstPrice;
    }

    setPortalKeyError('');
    setPortalKeySuccess('');

    // Fetch profile to verify and deduct balance
    let targetProfileId = null;
    let oldBalance = balance;
    try {
      const { data: prof, error } = await supabase.from('profiles').select('id, balance').eq('username', currentUser).single();
      if (!error && prof) {
        targetProfileId = prof.id;
        oldBalance = parseFloat(prof.balance) || 0;
      }
    } catch (e) {}

    if (oldBalance < finalKeyPrice) {
      await showAlert(
        'Insufficient Balance',
        `Insufficient balance. You need PHP ${finalKeyPrice} available in your wallet. Please cash-in to top up.`
      );
      return;
    }

    const serialNum = await showPrompt(
      'Activate PortalKey',
      'Enter your MikroTik Device Serial Number (found in System -> Routerboard):',
      '',
      'MikroTik Serial'
    );
    if (serialNum === null) return;
    if (serialNum.trim() === '') {
      setPortalKeyError('Routerboard serial number has to be inputted.');
      return;
    }

    const serialVal = serialNum.trim().toUpperCase();
    const portalKey = generatePortalKeyFromSerial(serialVal);
    if (!portalKey) {
      setPortalKeyError('Invalid routerboard serial inputted.');
      return;
    }

    const finalBalance = oldBalance - finalKeyPrice;

     // 1. Charge balance in profiles
     if (targetProfileId) {
       try {
         await supabase.from('profiles').update({ balance: finalBalance }).eq('id', targetProfileId);
       } catch (e) {
         console.error('Failed to update balance in profiles:', e);
         // We'll still continue since we have local storage fallback
       }
     }

     // 2. Log key key registry buy in portal_keys
     try {
       const { data: sessionData } = await supabase.auth.getSession();
       const userId = sessionData?.session?.user?.id || null;
       await supabase.from('portal_keys').insert([{
         user_id: userId,
         username: currentUser,
         serial_number: serialVal,
         portal_key: portalKey,
         status: 'approved',
         date: new Date().toISOString()
       }]);
     } catch (e) {
       console.error('Failed to insert portal key into Supabase:', e);
       // We'll still continue since we have local storage fallback
     }

    ActivityLogger.logActivity('portalkey_purchased', `Purchased active Activation Key (charged PHP ${finalKeyPrice}) for MikroTik Serial ${serialVal}`, { serialNumber: serialVal, key: portalKey, chargedAmount: finalKeyPrice });

    // Instantly update states to reflect generated key on UI
    setShowPortalKeys(true);

    setPortalKeySuccess('Billing transaction approved! Your active Routerboard PortalKey code is ready.');
    await showAlert('Success', 'Billing transaction approved! Your active Routerboard PortalKey code is ready.');
    await loadUserMetadata();
    onUpdateBalance?.();
  };

  const handleCopyNumber = async () => {
    navigator.clipboard.writeText('09659067723').then(async () => {
      await showAlert('Copied', 'Treasurer cell number 09659067723 copied to clipboard!');
    });
  };

  const handleOpenGCash = async () => {
    try {
      await navigator.clipboard.writeText('09659067723');
      await showAlert(
        'GCash Number Copied', 
        'Treasurer GCash number (09659067723) has been copied successfully to your clipboard!\n\nRedirecting to your GCash app now. Please select "Express Send" in the GCash app and paste the copied number.'
      );
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }

    // Redirect or launch GCash App with device-appropriate deep link mechanism
    setTimeout(() => {
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        // Use standard Android Intent scheme for com.globe.gcash.android to robustly open the app
        window.location.href = 'intent://#Intent;scheme=gcash;package=com.globe.gcash.android;end';
      } else {
        // Fallback or iOS default
        window.location.href = 'gcash://';
      }
    }, 400);
  };



  // Voucher generation form submit
  const handleGenerateVouchers = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsExportActive(false);

    if (!isAccessGranted) {
      setFormError('Your generator rent subscription is locked or expired. Buy access to unlock configuration pages.');
      return;
    }

    const trimmedPrefix = prefix.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9]{1,4}$/.test(trimmedPrefix)) {
      setFormError('Voucher prefix has to be 1 to 4 alphanumeric characters only.');
      return;
    }

    if (trimmedPrefix.length > charLength) {
      setFormError('Prefix string cannot exceed overall total voucher character length selection.');
      return;
    }

    try {
      const arr: Voucher[] = [];
      const localUsedCodes: Record<string, boolean> = {};

      for (let i = 0; i < quantity; i++) {
        const code = generateVoucherCode(trimmedPrefix, charLength, localUsedCodes);
        localUsedCodes[code] = true; // Mark as generated in this batch to prevent duplicates
        arr.push({
          code,
          amount: voucherAmount,
          validity: validityMinutes,
          time: timeMinutes,
          profile: userProfile.trim()
        });
      }

      setGeneratedVouchers(arr);

      // Save directly as a batch entry to Supabase database activity_logs synchronously
      await ActivityLogger.logActivityAsync('voucher_generated', `Generated ${quantity} guest hotspot voucher(s) using template ${template}`, { 
        count: quantity, 
        prefix: trimmedPrefix,
        vouchers: arr,
        time: timeMinutes,
        validity: validityMinutes,
        profile: userProfile.trim(),
        template,
        hotspotName
      });
      
      // Instantly reload user's Supabase voucher history
      await loadVoucherHistory();
      
      setFormSuccess(`${quantity} vouchers successfully computed and printed below! Logged on operations log.`);
    } catch (err: any) {
      setFormError(err.message || 'Error executing ticket computation loop.');
    }
  };

  // Load history of generated voucher batches from Supabase database
  const loadVoucherHistory = async () => {
    setIsHistoryLoading(true);
    try {
      // Fetch of user's logs directly from Supabase activity logs table
      const logs = await ActivityLogger.getActivitiesFromSupabase();
      
      const dbBatches: VoucherBatch[] = logs
        .filter(log => log.type === 'voucher_generated' && log.user === currentUser)
        .map(log => {
          const details = log.details || {};
          const vouchersList = details.vouchers || [];
          return {
            id: String(log.id),
            timestamp: log.timestamp,
            username: log.user,
            count: details.count || vouchersList.length || 0,
            prefix: details.prefix || 'VC',
            time: details.time || 60,
            validity: details.validity || 60,
            profile: details.profile || '',
            template: (details.template as VoucherTemplate) || 'template1',
            hotspotName: details.hotspotName || 'MikroTik Hotspot',
            vouchers: vouchersList
          };
        })
        .filter(b => b.vouchers && b.vouchers.length > 0);

      setVoucherHistory(dbBatches);
    } catch (err) {
      console.error('Failed loading voucher history from Supabase:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Delete a specific batch from history
  const handleDeleteHistoryBatch = async (batchId: string, timestamp: string) => {
    const confirmDelete = await showConfirm(
      'Delete Voucher Batch',
      'Are you sure you want to delete this voucher batch from your history records? This won\'t expire cards in your hotspot router, but will clear it from your history list.',
      'Delete from History',
      'Cancel'
    );
    if (!confirmDelete) return;

    // Remove from activity_logs in Supabase database
    try {
      if (batchId && !batchId.startsWith('batch_')) {
        await supabase.from('activity_logs').delete().eq('id', batchId);
      } else {
        const marginBefore = new Date(new Date(timestamp).getTime() - 10000).toISOString();
        const marginAfter = new Date(new Date(timestamp).getTime() + 10000).toISOString();
        
        await supabase.from('activity_logs')
          .delete()
          .eq('type', 'voucher_generated')
          .eq('username', currentUser)
          .gte('timestamp', marginBefore)
          .lte('timestamp', marginAfter);
      }
    } catch (err) {
      console.warn('Could not delete database log entry:', err);
    }

    await loadVoucherHistory();
    await showAlert('Batch Deleted', 'The selected voucher batch has been deleted from history.');
  };

  // Action: Export MikroTik RSC Script Download
  const handleExportRSC = async () => {
    const rscScript = generateMikroTikScript(generatedVouchers, hotspotName);
    const suffix = new Date().getTime().toString().slice(-6);
    const fileName = `vouchers-${suffix}.rsc`;

    const blob = new Blob([rscScript], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const clickLink = document.createElement('a');
    clickLink.href = downloadUrl;
    clickLink.download = fileName;
    clickLink.className = 'hidden';
    document.body.appendChild(clickLink);
    clickLink.click();
    document.body.removeChild(clickLink);
    URL.revokeObjectURL(downloadUrl);

    setIsExportActive(true);
    ActivityLogger.logActivity('voucher_exported', `Downloaded RSC router terminal script matching ${generatedVouchers.length} codes`, { format: 'RSC' });
    await showAlert(
      'Script Generated',
      `Script generated successfully! Copy and paste this script into your MikroTik terminal.`
    );
  };

  // Action: Export CSV Download
  const handleExportCSV = () => {
    const csvContent = exportToCSVContent(generatedVouchers);
    const suffix = new Date().getTime().toString().slice(-6);
    const fileName = `vouchers-${suffix}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const clickLink = document.createElement('a');
    clickLink.href = downloadUrl;
    clickLink.download = fileName;
    clickLink.className = 'hidden';
    document.body.appendChild(clickLink);
    clickLink.click();
    document.body.removeChild(clickLink);
    URL.revokeObjectURL(downloadUrl);

    ActivityLogger.logActivity('voucher_exported', `Exported operator voucher table to Microsoft Excel compatible csv format`, { format: 'CSV' });
  };

  // Action: Copy all codes straight to layout clipboard
  const handleCopyAllCodes = () => {
    const arrayCodes = generatedVouchers.map(v => {
      const timeStr = formatTimeForDisplay(v.time);
      const valStr = formatTimeForDisplay(v.validity);
      return `${v.code} - PHP ${v.amount} (Uptime: ${timeStr}, Valid: ${valStr}${v.profile ? `, Profile: ${v.profile}` : ''})`;
    });

    navigator.clipboard.writeText(arrayCodes.join('\n')).then(() => {
      setCopiedCodesSuccess(true);
      setTimeout(() => setCopiedCodesSuccess(false), 2500);
      ActivityLogger.logActivity('voucher_exported', `Copied ${generatedVouchers.length} compiled tickets directly to clipboard`, { format: 'Clipboard' });
    });
  };

  // Action: Copy the compiled MikroTik RSC script to clipboard
  const handleCopyVoucherScript = () => {
    const rscScript = generateMikroTikScript(generatedVouchers, hotspotName);
    navigator.clipboard.writeText(rscScript).then(() => {
      setCopiedScriptSuccess(true);
      setTimeout(() => setCopiedScriptSuccess(false), 2500);
      ActivityLogger.logActivity('voucher_exported', `Copied MikroTik RSC Script directly to clipboard`, { format: 'RSC_Inline' });
    });
  };

  // Action: Native custom PDF generating with grid pages
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Page specs - calculated to perfectly center 5x19 cards of 38mm x 14mm on A4 page
    const itemWidth = 38;
    const itemHeight = 14;
    const gridGap = 1.0;
    
    const colsCount = 5;
    const rowsCount = 19;
    const batchPageLimit = colsCount * rowsCount;
    const hasProfile = generatedVouchers.some(v => v.profile && v.profile.trim().length > 0);

    const printMarginLeft = (210 - (colsCount * itemWidth + (colsCount - 1) * gridGap)) / 2; // ~8.0 mm
    const printMarginTop = (297 - (rowsCount * itemHeight + (rowsCount - 1) * gridGap)) / 2; // ~6.5 mm

    generatedVouchers.forEach((v, index) => {
      if (index > 0 && index % batchPageLimit === 0) {
        doc.addPage();
      }

      // Grids positioning coordinate index
      const locInPage = index % batchPageLimit;
      const rIdx = Math.floor(locInPage / colsCount);
      const cIdx = locInPage % colsCount;

      const x = printMarginLeft + cIdx * (itemWidth + gridGap);
      const y = printMarginTop + rIdx * (itemHeight + gridGap);

      // Template structural coloring choices representation
      if (template === 'template2') {
        // Modern Indigo / Cyan
        doc.setDrawColor(99, 102, 241); // indigo-500
        doc.setFillColor(248, 250, 255); // faint backing tint (indigo-50)
        doc.roundedRect(x, y, itemWidth, itemHeight, 1.0, 1.0, 'FD');

        // Vertical divider
        doc.setLineWidth(0.08);
        doc.setDrawColor(224, 231, 255); // Indigo-100 line
        doc.line(x + 24.5, y + 1.2, x + 24.5, y + 12.8);
        
        // Left Column elements:
        // Hotspot Name / Title (Left side)
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFont('Helvetica', 'bold');
        const headerText = hotspotName.toUpperCase().trim();
        let fs = 4.2;
        doc.setFontSize(fs);
        while (doc.getTextWidth(headerText) > 21.0 && fs > 1.2) {
          fs -= 0.1;
          doc.setFontSize(fs);
        }
        doc.text(headerText, x + 2.0, y + 2.6, { baseline: 'middle' });

        // Code Background Capsule
        doc.setFillColor(224, 231, 255); // indigo-100
        doc.roundedRect(x + 2.0, y + 4.2, 21.0, 4.8, 0.6, 0.6, 'F');

        // Core Code (Centered inside capsule)
        doc.setTextColor(67, 56, 202); // indigo-700
        doc.setFont('Courier', 'bold');
        doc.setFontSize(10.0);
        doc.text(v.code, x + 12.5, y + 6.8, { align: 'center', baseline: 'middle' });

        // Profile / Bottom subtext
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(2.8);
        if (hasProfile && v.profile) {
          doc.setTextColor(124, 58, 237); // Purple for profile
          doc.text(`Prof: ${v.profile.substring(0, 12)}`, x + 2.0, y + 11.2, { baseline: 'middle' });
        }

        // Right Column elements:
        // Price Badge (Solid Indigo capsule)
        doc.setFillColor(99, 102, 241); // indigo-500
        doc.roundedRect(x + 25.4, y + 1.4, 11.0, 3.6, 0.6, 0.6, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.0);
        doc.text(`P${v.amount}`, x + 31.0, y + 3.2, { align: 'center', baseline: 'middle' });

        // TIME & VALIDITY
        doc.setTextColor(71, 85, 105); // slate-600
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(2.8);
        doc.text(`TIME: ${formatTimeForDisplay(v.time)}`, x + 25.2, y + 7.4, { baseline: 'middle' });
        doc.text(`VALIDITY: ${formatTimeForDisplay(v.validity)}`, x + 25.2, y + 11.2, { baseline: 'middle' });

      } else if (template === 'template3') {
        // Classic Warm Parchment
        doc.setDrawColor(139, 90, 43); // warm brown
        doc.setFillColor(254, 252, 245); // vintage paper / bone cream
        doc.roundedRect(x, y, itemWidth, itemHeight, 1.0, 1.0, 'FD');

        // Vertical divider
        doc.setLineWidth(0.08);
        doc.setDrawColor(217, 190, 165); // Warm bronze line
        doc.line(x + 24.5, y + 1.2, x + 24.5, y + 12.8);
        
        // Left Column elements:
        // Hotspot Name / Title
        doc.setTextColor(62, 39, 35); // dark espresso coffee
        doc.setFont('Courier', 'bold');
        const headerText = hotspotName.toUpperCase().trim();
        let fs = 4.2;
        doc.setFontSize(fs);
        while (doc.getTextWidth(headerText) > 21.0 && fs > 1.2) {
          fs -= 0.1;
          doc.setFontSize(fs);
        }
        doc.text(headerText, x + 2.0, y + 2.6, { baseline: 'middle' });

        // Code Background Capsule
        doc.setFillColor(243, 227, 205); // parchment gold-tan background
        doc.roundedRect(x + 2.0, y + 4.2, 21.0, 4.8, 0.6, 0.6, 'F');

        // Core Code
        doc.setTextColor(178, 34, 34); // firebrick red
        doc.setFont('Courier', 'bold');
        doc.setFontSize(10.0);
        doc.text(v.code, x + 12.5, y + 6.8, { align: 'center', baseline: 'middle' });

        // Profile / Bottom subtext
        doc.setFont('Courier', 'bold');
        doc.setFontSize(2.8);
        if (hasProfile && v.profile) {
          doc.setTextColor(180, 83, 9); // Warm amber profile
          doc.text(`Prof: ${v.profile.substring(0, 12)}`, x + 2.0, y + 11.2, { baseline: 'middle' });
        }

        // Right Column elements:
        // Price Badge
        doc.setFillColor(139, 90, 43); // warm brown
        doc.roundedRect(x + 25.4, y + 1.4, 11.0, 3.6, 0.6, 0.6, 'F');

        doc.setTextColor(251, 241, 199); // parchment white-cream
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.0);
        doc.text(`P${v.amount}`, x + 31.0, y + 3.2, { align: 'center', baseline: 'middle' });

        // TIME & VALIDITY
        doc.setTextColor(93, 64, 55); // mocha brown
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(2.8);
        doc.text(`TIME: ${formatTimeForDisplay(v.time)}`, x + 25.2, y + 7.4, { baseline: 'middle' });
        doc.text(`VALIDITY: ${formatTimeForDisplay(v.validity)}`, x + 25.2, y + 11.2, { baseline: 'middle' });

      } else {
        // Standard Elite Slate High Contrast
        doc.setDrawColor(100, 116, 139); // slate-500
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(x, y, itemWidth, itemHeight, 1.0, 1.0, 'FD');

        // Vertical divider
        doc.setLineWidth(0.08);
        doc.setDrawColor(226, 232, 240); // Slate-200 line
        doc.line(x + 24.5, y + 1.2, x + 24.5, y + 12.8);
        
        // Left Column elements:
        // Hotspot Name / Title
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('Helvetica', 'bold');
        const headerText = hotspotName.toUpperCase().trim();
        let fs = 4.2;
        doc.setFontSize(fs);
        while (doc.getTextWidth(headerText) > 21.0 && fs > 1.2) {
          fs -= 0.1;
          doc.setFontSize(fs);
        }
        doc.text(headerText, x + 2.0, y + 2.6, { baseline: 'middle' });

        // Code Background Capsule
        doc.setFillColor(241, 245, 249); // slate-100 background
        doc.roundedRect(x + 2.0, y + 4.2, 21.0, 4.8, 0.6, 0.6, 'F');

        // Core Code
        doc.setTextColor(220, 38, 38); // Red-600
        doc.setFont('Courier', 'bold');
        doc.setFontSize(10.0);
        doc.text(v.code, x + 12.5, y + 6.8, { align: 'center', baseline: 'middle' });

        // Profile / Bottom subtext
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(2.8);
        if (hasProfile && v.profile) {
          doc.setTextColor(30, 41, 59); // Dark slate
          doc.text(`Prof: ${v.profile.substring(0, 12)}`, x + 2.0, y + 11.2, { baseline: 'middle' });
        }

        // Right Column elements:
        // Price Badge
        doc.setFillColor(30, 41, 59); // slate-800 dark
        doc.roundedRect(x + 25.4, y + 1.4, 11.0, 3.6, 0.6, 0.6, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.0);
        doc.text(`P${v.amount}`, x + 31.0, y + 3.2, { align: 'center', baseline: 'middle' });

        // TIME & VALIDITY
        doc.setTextColor(71, 85, 105); // slate-600
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(2.8);
        doc.text(`TIME: ${formatTimeForDisplay(v.time)}`, x + 25.2, y + 7.4, { baseline: 'middle' });
        doc.text(`VALIDITY: ${formatTimeForDisplay(v.validity)}`, x + 25.2, y + 11.2, { baseline: 'middle' });
      }
    });

    // Save and record trigger down
    const suffix = new Date().getTime().toString().slice(-6);
    doc.save(`vouchers-${template}-${suffix}.pdf`);
    ActivityLogger.logActivity('voucher_exported', `Generated grid-aligned printable PDF package matching ${generatedVouchers.length} cards`, { format: 'PDF', template: template });
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Dynamic Expiration / Notice Indicators */}
      {!isAccessGranted && (
        <div className="bg-gradient-to-r from-red-900/30 to-rose-900/15 border border-red-500/20 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-red-500/[0.02] animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center border border-red-500/20 shrink-0 mt-0.5">
              <BadgeAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">
                {isExpired ? 'Operator Rent Access EXPIRED' : 'No Access Rent Session Token Found'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {isExpired 
                  ? `Your 1-Month Voucher generator sub rental expired on [${expiration ? expiration.split('T')[0] : ''}]. Renew today to continue printing codes.`
                  : 'Your account is currently inactive on the code printing pool. Purchase a 1-Month generator lease below.'
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleActivateGeneratorClick}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold rounded-xl text-xs shadow-md transition-all shrink-0 text-center uppercase tracking-wider block"
          >
            Activate Generator Now
          </button>
        </div>
      )}

      {isAccessGranted && currentUser !== 'admin' && (
        <div className="bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-slate-900/10 border border-emerald-500/20 p-5.5 rounded-2xl flex items-center gap-3.5 shadow-md shadow-emerald-500/[0.01]">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Voucher Generator Session Active
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-mono uppercase">
                {remainingDays} Days Left
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Authorized rent session valid until <strong className="text-slate-250 font-mono text-[11px] bg-slate-950/50 p-1 py-0.5 rounded border border-slate-855 ml-1">{expiration ? expiration.split('T')[0] : ''}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Top action modules cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Buy Promo Card */}
        {currentUser !== 'admin' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-[#aaa] font-bold">1-Month Rental</span>
                <span className="text-xs font-mono bg-[#1a3a2a] text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-full">
                  PHP {promoPrice}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-200">Re-Rent Voucher Generator</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlock generating forms and visual printable cards directly. Expires exactly 30 days starting activation date.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
              <button
                onClick={handleBuyPromo}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <PiggyBank className="w-4 h-4" />
                Purchase with Balance
              </button>
              <button
                onClick={() => handleToggleCard('promo', showPromo, setShowPromo)}
                className="w-full py-1.5 text-center text-slate-400 hover:text-slate-200 focus:outline-none text-[11px]"
              >
                {showPromo ? 'Hide rental purchase history' : 'Show rental purchase history'}
              </button>
            </div>

            {showPromo && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs space-y-2 max-h-[140px] overflow-y-auto animate-fade-in">
                <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Your Rental Sub Logs:</span>
                {userPromoHistory.length === 0 ? (
                  <span className="block text-slate-600 italic">No previous rental purchases logged.</span>
                ) : (
                  userPromoHistory.map((h, i) => (
                    <div key={h.date + i} className="bg-slate-950/40 border border-slate-855 rounded p-2 flex justify-between items-center">
                      <span className="text-emerald-400">PHP {h.price} paid</span>
                      <span className="text-slate-500 font-mono text-[9px]">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* GCash Cash In Card */}
        {currentUser !== 'admin' && (
          <div id="cash-in-card" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-[#aaa] font-bold">GCash Deposit</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-blue-400 font-mono">09659067723</span>
              </div>
              <h3 className="font-bold text-sm text-slate-200">Load Cash Portfolio Balance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send GCash payment to our treasurer number, copy reference, and file a verification deposit row ticket today.
              </p>
              
              <button
                onClick={handleOpenGCash}
                className="w-full mt-2.5 py-2.5 bg-[#0057E7] hover:bg-[#0047C4] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20 group cursor-pointer"
              >
                <Smartphone className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Open GCash App & Send</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                onClick={() => handleToggleCard('cash', showCashIn, setShowCashIn)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowDownCircle className="w-4 h-4" />
                Deposit Reference Tickets
              </button>
              <button
                onClick={handleCopyNumber}
                className="w-full py-1.5 text-center text-slate-450 hover:text-slate-350 focus:outline-none text-[11px]"
              >
                Copy treasurer number
              </button>
            </div>

            {showCashIn && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs space-y-3 animate-fade-in max-h-[220px] overflow-y-auto">
                {cashInSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400 text-[10px]">
                    {cashInSuccess}
                  </div>
                )}
                {cashInError && (
                  <div className="p-2.5 bg-red-500/10 rounded border border-red-500/20 text-red-400 text-[10px]">
                    {cashInError}
                  </div>
                )}
                
                <form onSubmit={handleCashInSubmit} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase mb-1">Transaction GCash Ref Number</label>
                    <input
                      type="text"
                      required
                      placeholder="Reference Number"
                      value={cashInRef}
                      onChange={(e) => setCashInRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase mb-1">Load Amount (PESO PHP)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={cashInAmount}
                      onChange={(e) => setCashInAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                  >
                    Submit Reference Ticket
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800/60 text-[10px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="block text-slate-500 uppercase tracking-widest font-bold">Active Ticket Queue:</span>
                    <button
                      type="button"
                      onClick={() => loadUserMetadata()}
                      className="text-indigo-400 hover:text-indigo-300 font-bold transition-all p-1 flex items-center gap-1 cursor-pointer focus:outline-none"
                      title="Sync with database"
                    >
                      <RefreshCw className="w-3 h-3 hover:rotate-180 transition-all duration-300" />
                      <span>Sync</span>
                    </button>
                  </div>
                  {userRequests.length === 0 ? (
                    <span className="text-slate-650 italic">No tickets filed yet.</span>
                  ) : (
                    userRequests.slice().reverse().map((req, i) => {
                      const isPending = req.status === 'pending';
                      const isApp = req.status === 'approved';
                      return (
                        <div key={req.refNumber + i} className="bg-slate-950/40 p-2 rounded border border-slate-855/50 flex justify-between items-center mb-1">
                          <div className="truncate pr-1">
                            <span className="block text-[11px] font-mono text-slate-350">{req.refNumber}</span>
                            <span className="text-[9px] text-slate-600">PHP {req.approvedAmount || req.amount} deposited</span>
                          </div>
                          <span className={`text-[9px] uppercase font-bold ${isPending ? 'text-slate-500' : isApp ? 'text-emerald-400' : 'text-red-400'}`}>
                             {req.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}



        {/* Buy PortalKey Card */}
        {currentUser !== 'admin' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-[#aaa] font-bold">PortalKey</span>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">
                    PHP {userPortalKeys.length === 0 ? portalKeyFirstPrice : portalKeySubsequentPrice}
                  </span>
                  <span className="text-[10px] text-emerald-400/90 font-medium tracking-wide">
                    {userPortalKeys.length === 0 
                      ? `First purchase: PHP ${portalKeyFirstPrice} (Subsequent: PHP ${portalKeySubsequentPrice})` 
                      : `Subsequent Discount Active: PHP ${portalKeySubsequentPrice}`
                    }
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-sm text-slate-200">{juanfiTitle}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {juanfiDescription}
              </p>
              <div className="pt-1.5 flex flex-wrap gap-2">
                <button
                  onClick={handleProtectedDownload}
                  className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold transition-all bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm cursor-pointer"
                  id="portal-download-button"
                >
                  <Download className="w-3.5 h-3.5 animate-pulse" />
                  Download Enhanced JuanFi Portal
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                onClick={handleBuyPortalKey}
                className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-4 h-4" />
                Buy Activation Key
              </button>
              <button
                onClick={() => handleToggleCard('port', showPortalKeys, setShowPortalKeys)}
                className="w-full py-1.5 text-center text-slate-450 hover:text-slate-350 focus:outline-none text-[11px]"
              >
                {showPortalKeys ? 'Hide generated key vault' : 'Show generated key vault'}
              </button>
            </div>

            {showPortalKeys && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs space-y-2 animate-fade-in max-h-[220px] overflow-y-auto">
                {portalKeySuccess && (
                  <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400 text-[10px]">
                    {portalKeySuccess}
                  </div>
                )}
                {portalKeyError && (
                  <div className="p-2 bg-red-500/10 rounded border border-red-500/20 text-red-400 text-[10px]">
                    {portalKeyError}
                  </div>
                )}

                <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Your Activated Serial Keys:</span>
                {userPortalKeys.length === 0 ? (
                  <span className="block text-slate-650 italic">No keys currently bought in this account.</span>
                ) : (
                  userPortalKeys.map((el, idx) => (
                    <div key={el.id || `${el.code}-${idx}`} className="bg-slate-950/40 border border-slate-855 rounded p-2.5 space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-slate-500">
                        <span>Serial: <code className="text-slate-300 font-mono font-bold">{el.serial || 'N/A'}</code></span>
                        <span>{new Date(el.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 bg-slate-950 p-2 rounded border border-slate-850/80">
                        <code className="text-emerald-400 font-mono text-xs select-all flex-1 truncate">{el.code}</code>
                        <button
                          onClick={async () => {
                            navigator.clipboard.writeText(el.code);
                            await showAlert('Copied', 'PortalKey code copied to clipboard!');
                          }}
                          className="p-1 px-1.5 bg-slate-800 text-slate-400 rounded hover:text-slate-100"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>
 


      {/* Main Voucher Generation Section wrapper */}
      {isAccessGranted && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Generator Control Form */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5.5 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-slate-100">Setup Voucher Code</h3>
              <p className="text-[11px] text-slate-450 mt-0.5">Configure hotspot values before generation</p>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleGenerateVouchers} className="space-y-4 text-xs">
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">Prefix (1-4 chars)</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 uppercase tracking-widest font-mono text-center font-bold"
                  placeholder="VC"
                />
              </div>

              <div>
                <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">Voucher Length</label>
                <input
                  type="number"
                  required
                  min={4}
                  max={16}
                  value={charLength}
                  onChange={(e) => setCharLength(parseInt(e.target.value) || 6)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold font-mono text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">Cash Worth (PHP)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(parseInt(e.target.value) || 5)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">Quantity</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center font-bold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">Time (minutes)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(parseInt(e.target.value) || 60)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">Validity (minutes)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={validityMinutes}
                  onChange={(e) => setValidityMinutes(parseInt(e.target.value) || 60)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-center text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">MikroTik Profile (Optional)</label>
              <input
                type="text"
                placeholder="default"
                value={userProfile}
                onChange={(e) => setUserProfile(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">Visual card styling template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value as VoucherTemplate)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="template1">Standard Layout (Dashed/High Contrast)</option>
                <option value="template2">Modern Template (Indigo Accent)</option>
                <option value="template3">Classic Layout (Warm Parchment/Brown)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-450 mb-1 font-semibold uppercase tracking-wider text-[10px]">MikroTik Hotspot Header</label>
              <input
                type="text"
                required
                value={hotspotName}
                onChange={(e) => setHotspotName(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-bold rounded-xl transition-all shadow-lg text-xs"
            >
              Generate printable vouchers
            </button>
          </form>

        </div>

        {/* Right Side: Printing Output & Actions */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5.5 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setOutputTab('live')}
                  className={`flex items-center gap-2 pb-2 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer ${
                    outputTab === 'live'
                      ? 'border-indigo-500 text-slate-100'
                      : 'border-transparent text-slate-450 hover:text-slate-200'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-indigo-400" />
                  Live Output ({generatedVouchers.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOutputTab('history');
                    loadVoucherHistory();
                  }}
                  className={`flex items-center gap-2 pb-2 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer ${
                    outputTab === 'history'
                      ? 'border-indigo-500 text-slate-100'
                      : 'border-transparent text-slate-450 hover:text-slate-200'
                  }`}
                >
                  <History className="w-4 h-4 text-indigo-400" />
                  Voucher History ({voucherHistory.length})
                </button>
              </div>
            </div>

            {outputTab === 'live' && (
              <>
                {generatedVouchers.length > 0 ? (
                  <div className="space-y-4 animate-fade-in">
                    {/* Additional file export utilities */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={handleExportCSV}
                        className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Save CSV Table
                      </button>
                      <button
                        onClick={handleExportRSC}
                        className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
                      >
                        <Code className="w-3.5 h-3.5 text-indigo-400" />
                        Save RSC Script
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="px-3.5 py-2 bg-slate-850 hover:bg-[#8b5a2b]/20 border border-[#8b5a2b]/30 text-amber-500 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Print / Download PDF cards
                      </button>
                    </div>

                    {/* Voucher Script Preview representing formatted MikroTik ROS script directly below download list */}
                    <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-450 tracking-wide uppercase">
                          voucher script preview
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyVoucherScript}
                          className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedScriptSuccess ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <ClipboardCopy className="w-3 h-3 text-indigo-400" />
                              Copy Script
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <pre className="max-h-52 overflow-y-auto w-full bg-slate-950 font-mono text-[10.5px] leading-relaxed text-slate-400 p-3 rounded-lg border border-slate-900 scrollbar-thin select-all whitespace-pre-wrap break-all">
                          {generateMikroTikScript(generatedVouchers, hotspotName)}
                        </pre>
                      </div>
                    </div>



                  </div>
                ) : (
                  <VoucherCardList
                    vouchers={[]}
                    template={template}
                    hotspotName={hotspotName}
                  />
                )}
              </>
            )}

            {outputTab === 'history' && (
              <div className="space-y-4 animate-fade-in">
                {isHistoryLoading ? (
                  <div className="text-center py-12 text-slate-500 font-medium">
                    <RefreshCw className="w-10 h-10 mx-auto animate-spin mb-3 text-indigo-400" />
                    Fetching generated voucher history...
                  </div>
                ) : voucherHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-medium border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    No generated voucher batches found in your history log.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                    {voucherHistory.map((batch) => {
                      const date = new Date(batch.timestamp);
                      return (
                        <div key={batch.id} className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/40 rounded-xl p-4 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {date.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {batch.id.substring(0, 14)}</span>
                              {batch.username && batch.username !== currentUser && (
                                <span className="text-[10px] text-pink-400 border border-pink-500/20 bg-pink-500/5 px-1.5 py-0.5 rounded-md">
                                  Operator: {batch.username}
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                              <span>Batch of <strong className="text-emerald-400">{batch.count || batch.vouchers.length}</strong> vouchers</span>
                              <span className="text-xs text-slate-450 font-normal">
                                (prefix <strong className="text-slate-300 font-mono font-bold">{batch.prefix}</strong>, duration: {formatTimeForDisplay(batch.time)})
                              </span>
                            </div>
                            <p className="text-xs text-slate-450 truncate">
                              Hotspot: <strong className="text-slate-350 font-medium">{batch.hotspotName}</strong> 
                              {batch.profile ? ` • Profile: ${batch.profile}` : ''}
                              {` • Price: PHP ${batch.vouchers[0]?.amount || 5}`}
                              {batch.vouchers[0]?.validity ? ` • Validity: ${formatTimeForDisplay(batch.vouchers[0].validity)}` : ''}
                            </p>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto justify-end shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setGeneratedVouchers(batch.vouchers);
                                setTemplate(batch.template || 'template1');
                                setHotspotName(batch.hotspotName || 'MikroTik Hotspot');
                                setPrefix(batch.prefix || 'VC');
                                if (batch.vouchers[0]) {
                                  setVoucherAmount(batch.vouchers[0].amount);
                                  setTimeMinutes(batch.vouchers[0].time);
                                  setValidityMinutes(batch.vouchers[0].validity);
                                  setQuantity(batch.vouchers.length);
                                  setUserProfile(batch.vouchers[0].profile || '');
                                }
                                setOutputTab('live');
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/15 flex items-center gap-1 select-none"
                              title="Load batch elements back into active layout controls"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Load Batch
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryBatch(batch.id, batch.timestamp)}
                              className="p-2 text-slate-550 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-slate-800/60 hover:border-rose-500/20"
                              title="Remove batch history from records"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
      )}

      {/* Custom Dialog Overlay System */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="p-5 space-y-4 font-sans">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/15">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                </div>
                <h4 className="font-bold text-slate-100 text-sm">
                  {dialog.title}
                </h4>
              </div>
              <p className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap">
                {dialog.message}
              </p>

              {dialog.showInput && (
                <div className="mt-2">
                  <input
                    type={dialog.inputType || 'text'}
                    value={dialog.inputValue}
                    placeholder={dialog.inputPlaceholder}
                    onChange={(e) => setDialog(prev => ({ ...prev, inputValue: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        dialog.onConfirm(dialog.inputValue);
                      }
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                {dialog.type !== 'alert' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (dialog.onCancel) dialog.onCancel();
                      else setDialog(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-850 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {dialog.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dialog.onConfirm(dialog.inputValue)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {dialog.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
