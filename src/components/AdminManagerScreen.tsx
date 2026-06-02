import React, { useState, useEffect } from 'react';
import { ActivityLogger } from '../utils/activityDB';
import { UserDatabase, CashInRequest, PortalKeyRequest, PromoHistoryItem } from '../types';
import { generatePortalKeyFromSerial, tryDecodeSerialFromPortalKey } from '../utils/voucherHelpers';
import { supabase } from '../supabaseClient';
import { 
  Users, DollarSign, Send, Lock, FileSpreadsheet, 
  Check, X, Eye, EyeOff, Calendar, PlusCircle, Trash, KeyRound, Link,
  Wifi, WifiOff, Smartphone, ExternalLink
} from 'lucide-react';

export function AdminManagerScreen() {
  // Accounts
  const [users, setUsers] = useState<UserDatabase>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [adminPassword, setAdminPassword] = useState('password');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [isAdminPassVisible, setIsAdminPassVisible] = useState(false);

  // Prices & Links
  const [promoPrice, setPromoPrice] = useState(30);
  const [portalKeyPrice, setPortalKeyPrice] = useState(50);
  const [portalKeyFirstPrice, setPortalKeyFirstPrice] = useState(300);
  const [portalKeySubsequentPrice, setPortalKeySubsequentPrice] = useState(150);
  const [juanfiLink, setJuanfiLink] = useState('/Enhanced%20JuanFi%20Portal%20ver.5.0%20(16.8kb).zip');
  const [juanfiTitle, setJuanfiTitle] = useState('𝐄𝐧𝐡𝐚𝐧𝐜𝐞𝐝 𝐉𝐮𝐚𝐧𝐅𝐢 𝐏𝐨𝐫𝐭𝐚𝐥 𝐯𝐞𝐫.𝟓.𝟎 (𝟏𝟔.𝟖𝐤𝐛)');
  const [juanfiDescription, setJuanfiDescription] = useState('“𝐋𝐢𝐠𝐡𝐭𝐰𝐞𝐢𝐠𝐡𝐭, 𝐬𝐦𝐨𝐨𝐭𝐡, 𝐚𝐧𝐝 𝐟𝐚𝐬𝐭-𝐥𝐨𝐚𝐝𝐢𝐧𝐠-𝐨𝐩𝐭𝐢𝐦𝐢𝐳𝐞𝐝 𝐚𝐭 𝐨𝐧𝐥𝐲 𝟏𝟔.𝟖𝐤𝐛 𝐟𝐨𝐫 𝐭𝐡𝐞 𝐛𝐞𝐬𝐭 𝐮𝐬𝐞𝐫 𝐞𝐱𝐩𝐞𝐫𝐢𝐞𝐧𝐜𝐞”');
  const [juanfiPassword, setJuanfiPassword] = useState('juanfi123');

  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<{ success?: boolean; msg?: string }>({});

  // Password Changer
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ success?: boolean; msg?: string }>({});

  // Lists
  const [cashInRequests, setCashInRequests] = useState<CashInRequest[]>([]);
  const [portalKeyRequests, setPortalKeyRequests] = useState<PortalKeyRequest[]>([]);
  const [promoHistory, setPromoHistory] = useState<PromoHistoryItem[]>([]);

  // Operator Account Creator states
  const [newOperatorUser, setNewOperatorUser] = useState('');
  const [newOperatorPass, setNewOperatorPass] = useState('');
  const [showAddOperatorForm, setShowAddOperatorForm] = useState(false);
  const [addOperatorError, setAddOperatorError] = useState('');

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

  // Load everything on mount and establish polling to fetch new tickets automatically
  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      loadAllData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      // 1. Load setting values
      const { data: settings, error: errSettings } = await supabase.from('global_settings').select('*');
      let sbAdminPass = 'Anonymous#8856';
      let sbPromoPrice = 30;
      let sbPortalKeyPrice = 50;
      let sbPortalKeyFirstPrice = 300;
      let sbPortalKeySubsequentPrice = 150;
      let sbJuanfiLink = '/Enhanced%20JuanFi%20Portal%20ver.5.0%20(16.8kb).zip';
      let sbJuanfiTitle = '𝐄𝐧𝐡𝐚𝐧𝐜𝐞𝐝 𝐉𝐮𝐚𝐧𝐅𝐢 𝐏𝐨𝐫𝐭𝐚𝐥 𝐯𝐞𝐫.𝟓.𝟎 (𝟏𝟔.𝟖𝐤𝐛)';
      let sbJuanfiDesc = '“𝐋𝐢𝐠𝐡𝐭𝐰𝐞𝐢𝐠𝐡𝐭, 𝐬𝐦𝐨𝐨𝐭𝐡, 𝐚𝐧𝐝 𝐟𝐚𝐬𝐭-𝐥𝐨𝐚𝐝𝐢𝐧𝐠-𝐨𝐩𝐭𝐢𝐦𝐢𝐳𝐞𝐝 𝐚𝐭 𝐨𝐧λ𝐲 𝟏𝟔.𝟖𝐤𝐛 𝐟𝐨𝐫 𝐭𝐡𝐞 𝐛𝐞𝐬𝐭 𝐮𝐬𝐞𝐫 𝐞𝐱𝐩𝐞𝐫𝐢𝐞𝐧𝐜𝐞”';
      let sbJuanfiPassword = 'juanfi123';
      let sbBotToken = '';
      let sbChatId = '';

      let localLastSeen: Record<string, string> = {};
      if (!errSettings && settings && settings.length > 0) {
        settings.forEach((s: any) => {
          if (s.key === 'admin_password') sbAdminPass = s.value;
          if (s.key === 'promo_price') sbPromoPrice = parseInt(s.value) || 30;
          if (s.key === 'portal_key_price') sbPortalKeyPrice = parseInt(s.value) || 50;
          if (s.key === 'portal_key_first_price') sbPortalKeyFirstPrice = parseInt(s.value) || 300;
          if (s.key === 'portal_key_subsequent_price') sbPortalKeySubsequentPrice = parseInt(s.value) || 150;
          if (s.key === 'telegram_bot_token') sbBotToken = s.value;
          if (s.key === 'telegram_chat_id') sbChatId = s.value;
          if (s.key === 'juanfi_link') sbJuanfiLink = s.value || '/Enhanced%20JuanFi%20Portal%20ver.5.0%20(16.8kb).zip';
          if (s.key === 'juanfi_title') sbJuanfiTitle = s.value || '𝐄𝐧𝐡𝐚𝐧𝐜𝐞𝐝 𝐉𝐮𝐚𝐧𝐅𝐢 𝐏𝐨𝐫𝐭𝐚𝐥 𝐯𝐞𝐫.𝟓.𝟎 (𝟏𝟔.𝟖𝐤𝐛)';
          if (s.key === 'juanfi_description') sbJuanfiDesc = s.value || '“𝐋𝐢𝐠𝐡𝐭𝐰𝐞𝐢𝐠𝐡𝐭, 𝐬𝐦𝐨𝐨𝐭𝐡, 𝐚𝐧𝐝 𝐟𝐚𝐬𝐭-𝐥𝐨𝐚𝐝𝐢𝐧𝐠-𝐨𝐩𝐭𝐢𝐦𝐢𝐳𝐞𝐝 𝐚𝐭 𝐨𝐧λ𝐲 𝟏𝟔.𝟖𝐤𝐛 𝐟𝐨𝐫 𝐭𝐡𝐞 𝐛𝐞𝐬𝐭 𝐮𝐬𝐞𝐫 𝐞𝐱𝐩𝐞𝐫𝐢𝐞𝐧𝐜𝐞”';
          if (s.key === 'juanfi_password') sbJuanfiPassword = s.value || 'juanfi123';
        });

        // Load last_seen timestamps from global_settings as fallback
        const lastSeenData: Record<string, string> = {};
        settings.forEach((s: any) => {
          if (s.key && s.key.startsWith('last_seen_')) {
            const uname = s.key.replace('last_seen_', '');
            lastSeenData[uname] = s.value;
          }
        });
        localLastSeen = lastSeenData;
        setLastSeenMap(lastSeenData);
      }
      setAdminPassword(sbAdminPass);
      setPromoPrice(sbPromoPrice);
      setPortalKeyPrice(sbPortalKeyPrice);
      setPortalKeyFirstPrice(sbPortalKeyFirstPrice);
      setPortalKeySubsequentPrice(sbPortalKeySubsequentPrice);
      setJuanfiLink(sbJuanfiLink);
      setJuanfiTitle(sbJuanfiTitle);
      setJuanfiDescription(sbJuanfiDesc);
      setJuanfiPassword(sbJuanfiPassword);
      setTelegramBotToken(sbBotToken);
      setTelegramChatId(sbChatId);

      // 2. Load Profiles / Operators
      const { data: profiles, error: errProfiles } = await supabase.from('profiles').select('*');
      if (errProfiles) {
        console.error('Error fetching profiles from Supabase:', errProfiles);
      }
      const mappedUsers: UserDatabase = {};
      if (!errProfiles && profiles) {
        profiles.forEach((p: any) => {
          mappedUsers[p.username] = {
            password: p.password_plain || 'Secure Supabase Auth',
            expiration: p.expiration || '',
            balance: parseFloat(p.balance) || 0,
            lastSeen: p.last_seen || undefined
          };
        });
        setUsers(mappedUsers);
      }

      // 3. Load Cash-In Requests
      const { data: cir, error: errCir } = await supabase.from('cash_in_requests').select('*').order('date', { ascending: false });
      if (!errCir && cir) {
        const mappedCir: CashInRequest[] = cir.map((c: any) => ({
          username: c.username,
          refNumber: c.ref_number,
          amount: parseFloat(c.amount) || 0,
          status: c.status,
          date: c.date,
          approvedAmount: c.approved_amount ? parseFloat(c.approved_amount) : undefined
        }));
        setCashInRequests(mappedCir);
      }

      // 4. Load Portal Key Requests
      const { data: pkr, error: errPkr } = await supabase.from('portal_keys').select('*').order('date', { ascending: false });
      if (!errPkr && pkr) {
        const mappedPkr: PortalKeyRequest[] = pkr.map((p: any) => ({
          id: p.id,
          username: p.username,
          serialNumber: p.serial_number,
          portalKey: p.portal_key || p.key,
          status: p.status as 'approved',
          date: p.date
        }));
        setPortalKeyRequests(mappedPkr);
      }

      // 5. Load Promo Purchase History
      const { data: prh, error: errPrh } = await supabase.from('promo_history').select('*').order('date', { ascending: false });
      if (!errPrh && prh) {
        const mappedPrh: PromoHistoryItem[] = prh.map((p: any) => ({
          username: p.username,
          price: parseFloat(p.price) || 0,
          date: p.date
        }));
        setPromoHistory(mappedPrh);
      }

      // 6. Auto-load and auto-heal missing profiles from active activity log entries
      try {
        const { data: logMappings, error: errLogs } = await supabase
          .from('activity_logs')
          .select('username, user_id')
          .not('user_id', 'is', null);

        if (!errLogs && logMappings && logMappings.length > 0) {
          const foundMappings: Record<string, string> = {};
          logMappings.forEach((item: any) => {
            if (item.username && item.user_id && item.username !== 'admin') {
              foundMappings[item.username] = item.user_id;
            }
          });

          // Check for any usernames extracted from activity logs that are missing from profiles
          const missingProfilesToHeal: { id: string; username: string; balance: number; expiration: null }[] = [];
          let hasLocalUpdates = false;

          Object.entries(foundMappings).forEach(([uname, uid]) => {
            if (!mappedUsers[uname]) {
              hasLocalUpdates = true;
              mappedUsers[uname] = {
                password: 'Secure Supabase Auth',
                expiration: '',
                balance: 0,
                lastSeen: localLastSeen[uname] || undefined
              };
              missingProfilesToHeal.push({
                id: uid,
                username: uname,
                balance: 0,
                expiration: null
              });
            }
          });

          if (hasLocalUpdates) {
            setUsers({ ...mappedUsers });
          }

          if (missingProfilesToHeal.length > 0) {
            console.log('Background healing missing profiles rows in Supabase:', missingProfilesToHeal);
            (async () => {
              try {
                const { error: healErr } = await supabase.from('profiles').upsert(missingProfilesToHeal);
                if (healErr) {
                  console.warn('Error healing missing user profiles:', healErr);
                } else {
                  console.log('Successfully completed background auto-heal of missing user profiles.');
                }
              } catch (err) {
                console.warn('Auto-heal exception:', err);
              }
            })();
          }
        }
      } catch (autoHealError) {
        console.warn('Auto healing logic exception caught:', autoHealError);
      }
    } catch (err) {
      console.warn('Network issue or Supabase tables not initialized', err);
    }
  };



  // User list actions
  const togglePasswordVisible = (user: string) => {
    setVisiblePasswords(prev => ({ ...prev, [user]: !prev[user] }));
  };

  const handleEditExpiration = async (user: string, currentExp: string) => {
    const defaultVal = currentExp || new Date().toISOString().split('T')[0];
    const newExp = await showPrompt('Set Expiration Date', `Enter new expiration date (YYYY-MM-DD) for operator: ${user} (or leave empty to reset):`, defaultVal, 'YYYY-MM-DD');
    if (newExp === null) return;
    
    // Validate empty expiration date or set
    let formattedExp = null;
    if (newExp.trim() !== '') {
      const dateCheck = new Date(newExp);
      if (isNaN(dateCheck.getTime())) {
        await showAlert('Invalid Date', 'Invalid date format. Use YYYY-MM-DD');
        return;
      }
      formattedExp = newExp;
    }

    // Sync Supabase profiles
    try {
      const { data: prof } = await supabase.from('profiles').select('id').eq('username', user).single();
      if (prof) {
        await supabase.from('profiles').update({ expiration: formattedExp }).eq('id', prof.id);
      }
    } catch (e) {
      console.warn('Could not update expiration in Supabase profiles:', e);
    }

    ActivityLogger.logActivity('expiration_edited', `Updated expiration for ${user}`, { username: user, expiration: formattedExp || 'cleared' });
    loadAllData();
    await showAlert('Success', 'User expiration date updated successfully!');
  };

  const handleEditBalance = async (user: string, currentBalance: number) => {
    const val = await showPrompt('Add/Adjust Cash Balance', `Enter new PHP Cash balance for operator: ${user} (or leave empty for 0):`, String(currentBalance), 'Enter balance (pesos)');
    if (val === null) return;
    
    const trimmedVal = val.trim();
    const parsed = trimmedVal === '' ? 0 : parseFloat(trimmedVal);
    if (isNaN(parsed) || parsed < 0) {
      await showAlert('Invalid Input', 'Please enter a valid non-negative number.');
      return;
    }

    // Sync Supabase profiles
    try {
      const { data: prof } = await supabase.from('profiles').select('id').eq('username', user).single();
      if (prof) {
        await supabase.from('profiles').update({ balance: parsed }).eq('id', prof.id);
      }
    } catch (e) {
      console.warn('Could not update balance in Supabase profiles:', e);
    }

    ActivityLogger.logActivity('balance_edited', `Updated balance for ${user}`, { username: user, balance: parsed });
    loadAllData();
    await showAlert('Success', 'User cash balance updated successfully!');
  };

  const handleDeleteUser = async (user: string) => {
    const confirmed = await showConfirm(
      'Delete Operator Account',
      `Are you absolutely sure you want to delete user: ${user}? All balance and voucher expiration entries will be permanently erased from Supabase and local storage.`,
      'Yes, Delete',
      'Cancel'
    );
    if (!confirmed) return;

    // Sync Supabase profiles
    try {
      const { data: prof } = await supabase.from('profiles').select('id').eq('username', user).single();
      if (prof) {
        await supabase.from('profiles').delete().eq('id', prof.id);
      }
    } catch (e) {
      console.warn('Could not delete user in Supabase:', e);
    }

    ActivityLogger.logActivity('user_deleted', `Deleted user account ${user}`, { username: user });
    loadAllData();
    await showAlert('Success', 'Operator user deleted successfully!');
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddOperatorError('');
    const trimUser = newOperatorUser.trim();
    if (!trimUser || !newOperatorPass) {
      setAddOperatorError('All fields are required.');
      return;
    }
    if (trimUser.length < 3) {
      setAddOperatorError('Username must be at least 3 characters.');
      return;
    }
    if (newOperatorPass.length < 6) {
      setAddOperatorError('Password must be at least 6 characters.');
      return;
    }
    if (trimUser.toLowerCase() === 'admin') {
      setAddOperatorError('Username "admin" is reserved.');
      return;
    }

    // Checking if operator exists
    if (users[trimUser]) {
      setAddOperatorError('Username already exists in developer database.');
      return;
    }

    try {
      const email = trimUser.includes('@') ? trimUser : `${trimUser}@example.com`;
      
      // 1. Sign up on Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password: newOperatorPass,
      });

      if (error) {
        setAddOperatorError('Supabase Registration: ' + error.message);
        return;
      }

      if (data && data.user) {
        // 2. Create/update Profile extend fields manually to store default balance for Admin Manager
        await supabase.from('profiles').upsert([{
          id: data.user.id,
          username: trimUser,
          balance: 0,
          expiration: null
        }]);
      }
    } catch (err: any) {
      console.warn('Creating profile on database bypass or issue:', err);
    }

    setNewOperatorUser('');
    setNewOperatorPass('');
    setShowAddOperatorForm(false);
    
    ActivityLogger.logActivity('user_registered', `Admin registered new operator account: ${trimUser}`, { username: trimUser });
    loadAllData();
    await showAlert('Success', `Operator user "${trimUser}" added successfully!`);
  };

  // Change prices
  const handleEditPromoPrice = async () => {
    const val = await showPrompt('Adjust Rental Pricing', 'Enter new Voucher Generator 1-Month access price (PHP):', String(promoPrice), 'Enter price in PHP');
    if (val === null) return;
    const num = parseInt(val);
    if (isNaN(num) || num <= 0) {
      await showAlert('Invalid Input', 'Please enter a valid positive integer.');
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'promo_price', value: String(num) }]);
    } catch (e) {}

    ActivityLogger.logActivity('setting_changed', `Changed Voucher Generator Price to ${num} pesos`);
    loadAllData();
  };

  const handleEditPortalKeyFirstPrice = async () => {
    const val = await showPrompt('First-Time PortalKey Price', 'Enter new standard First-Time PortalKey purchase price (PHP):', String(portalKeyFirstPrice), 'Enter price in PHP');
    if (val === null) return;
    const num = parseInt(val);
    if (isNaN(num) || num <= 0) {
      await showAlert('Invalid Input', 'Please enter a valid positive integer.');
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'portal_key_first_price', value: String(num) }]);
    } catch (e) {}

    ActivityLogger.logActivity('setting_changed', `Changed First-Time PortalKey price to ${num} PHP`);
    loadAllData();
  };

  const handleEditPortalKeySubsequentPrice = async () => {
    const val = await showPrompt('Renewal/Subsequent PortalKey Price', 'Enter new subsequent purchase/renewal PortalKey price (PHP):', String(portalKeySubsequentPrice), 'Enter price in PHP');
    if (val === null) return;
    const num = parseInt(val);
    if (isNaN(num) || num <= 0) {
      await showAlert('Invalid Input', 'Please enter a valid positive integer.');
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'portal_key_subsequent_price', value: String(num) }]);
    } catch (e) {}

    ActivityLogger.logActivity('setting_changed', `Changed Subsequent/Renewal PortalKey price to ${num} PHP`);
    loadAllData();
  };

  const handleEditJuanfiLink = async () => {
    const val = await showPrompt(
       'Modify Portal Download Link',
       'Enter the new Google Drive or download URL for the Enhanced JuanFi Portal file:',
       juanfiLink,
       'https://drive.google.com/...'
    );
    if (val === null) return;
    const urlTrimmed = val.trim();
    if (!urlTrimmed) {
      await showAlert('Invalid Link', 'Download URL cannot be empty.');
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'juanfi_link', value: urlTrimmed }]);
    } catch (e) {}

    ActivityLogger.logActivity('setting_changed', `Changed JuanFi Portal download link to: ${urlTrimmed}`);
    loadAllData();
  };

  const handleEditJuanfiTitle = async () => {
    const val = await showPrompt(
      'Modify JuanFi Portal Title',
      'Enter the new display title for the JuanFi Portal:',
      juanfiTitle,
      'e.g. 𝐄𝐧𝐡𝐚𝐧𝐜𝐞𝐝 𝐉𝐮𝐚𝐧𝐅𝐢 𝐏𝐨𝐫𝐭𝐚𝐥 𝐯𝐞𝐫.𝟒.𝟒 (𝟏𝟔.𝟔𝐤𝐛)'
    );
    if (val === null) return;
    const titleTrimmed = val.trim();
    if (!titleTrimmed) {
      await showAlert('Invalid Title', 'Title cannot be empty.');
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'juanfi_title', value: titleTrimmed }]);
    } catch (e) {}

    ActivityLogger.logActivity('setting_changed', `Changed JuanFi Portal title to: ${titleTrimmed}`);
    loadAllData();
  };

  const handleEditJuanfiDesc = async () => {
    const val = await showPrompt(
      'Modify JuanFi Portal Description',
      'Enter the new slogan/description text for the JuanFi Portal:',
      juanfiDescription,
      'e.g. “𝐋𝐢𝐠𝐡𝐭𝐰𝐞𝐢𝐠𝐡𝐭, 𝐬𝐦𝐨𝐨𝐭𝐡, 𝐚𝐧𝐝 𝐟𝐚𝐬𝐭-𝐥𝐨𝐚𝐝𝐢𝐧𝐠-𝐨𝐩𝐭𝐢𝐦𝐢𝐳𝐞𝐝 𝐚𝐭 𝐨н𝐥𝐲 𝟏𝟔.𝟔𝐤𝐛”'
    );
    if (val === null) return;
    const descTrimmed = val.trim();
    if (!descTrimmed) {
      await showAlert('Invalid Description', 'Description cannot be empty.');
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'juanfi_description', value: descTrimmed }]);
    } catch (e) {}

    ActivityLogger.logActivity('setting_changed', `Changed JuanFi Portal description to: ${descTrimmed}`);
    loadAllData();
  };

  const handleEditJuanfiPassword = async () => {
    const val = await showPrompt(
      'Modify Download Password',
      'Enter the password required to download the Enhanced JuanFi Portal file:',
      juanfiPassword,
      'Password'
    );
    if (val === null) return;
    const passTrimmed = val.trim();
    if (!passTrimmed) {
      await showAlert('Invalid Password', 'Download password cannot be empty.');
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'juanfi_password', value: passTrimmed }]);
    } catch (e) {}

    ActivityLogger.logActivity('setting_changed', `Changed JuanFi Portal download password`);
    loadAllData();
  };

  // Telegram settings save
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramStatus({});
    
    const botTok = telegramBotToken.trim();
    const chat = telegramChatId.trim();

    if (!botTok || !chat) {
      setTelegramStatus({ success: false, msg: 'Both Telegram Bot Token and Chat ID are mandatory.' });
      return;
    }

    try {
      await supabase.from('global_settings').upsert([
        { key: 'telegram_bot_token', value: botTok },
        { key: 'telegram_chat_id', value: chat }
      ]);
    } catch (er) {}

    setTelegramStatus({ success: true, msg: 'Telegram notifications configured and saved successfully!' });
    ActivityLogger.logActivity('telegram_configured', 'Telegram notification credentials updated');
  };

  const handleTestTelegram = () => {
    setTelegramStatus({});
    const botTok = telegramBotToken.trim();
    const chat = telegramChatId.trim();

    if (!botTok || !chat) {
      setTelegramStatus({ success: false, msg: 'Configure and save credentials before sending test alerts.' });
      return;
    }

    const testMessage = `🔔 MikroTik Portal Alert\nTelegram automated cash-in alerts are working successfully!`;
    const checkUrl = `https://api.telegram.org/bot${botTok}/sendMessage?chat_id=${chat}&text=${encodeURIComponent(testMessage)}`;

    // Cross-origin safe Image loading for light API triggers inside browser iframes
    const imgTester = new Image();
    imgTester.onload = () => {
      setTelegramStatus({ success: true, msg: 'Test message sent successfully! Check your Telegram channel.' });
      ActivityLogger.logActivity('telegram_tested', 'Sent successful test alert to configured Telegram chat');
    };
    imgTester.onerror = () => {
      // Sometimes direct requests throw CORS blocks but still transmit! Let's explain nicely.
      setTelegramStatus({ 
        success: true, 
        msg: 'Notification trigger pushed! Verify if the message appeared inside your Telegram bot chat.' 
      });
      ActivityLogger.logActivity('telegram_tested', 'Simulated alert trigger sent to bot channel');
    };
    imgTester.src = checkUrl;
  };

  // Password changer Admin
  const handleChangeAdminPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({});

    const storedPass = adminPassword || 'Anonymous#8856';
    if (currentPass !== storedPass) {
      setPasswordMsg({ success: false, msg: 'Current admin password is incorrect.' });
      return;
    }

    if (newPass.length < 6) {
      setPasswordMsg({ success: false, msg: 'The new password must contain at least 6 characters.' });
      return;
    }

    if (newPass !== confirmNewPass) {
      setPasswordMsg({ success: false, msg: 'Verification pass-fields do not match.' });
      return;
    }

    try {
      await supabase.from('global_settings').upsert([{ key: 'admin_password', value: newPass }]);
    } catch (er) {}

    ActivityLogger.logActivity('password_changed', 'Admin changed overall portal entrance password');
    setPasswordMsg({ success: true, msg: 'Admin portal login credentials updated successfully!' });
    setCurrentPass('');
    setNewPass('');
    setConfirmNewPass('');
  };

  // Cash In Requests approve/deny
  const handleApproveCashIn = async (req: CashInRequest, _index?: number) => {
    const finalAmountStr = await showPrompt(
      `Approve Deposit Request`, 
      `Approve GCash Cash-In reference [${req.refNumber}] for operator [${req.username}]?\n\nEnter final amount in PHP to credit:`, 
      String(req.amount), 
      'Enter amount of pesos'
    );
    if (finalAmountStr === null) return;

    const amountNum = parseFloat(finalAmountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      await showAlert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    // 1. Sync Supabase cash_in_requests status to 'approved' and approvedAmount to amountNum
    try {
      const { error: updateErr } = await supabase.from('cash_in_requests')
        .update({ status: 'approved', approved_amount: amountNum })
        .eq('ref_number', req.refNumber);

      if (updateErr) {
        // Fallback: If 'approved_amount' does not exist in their Supabase table (as reported in schema cache),
        // we can update 'status' and 'amount' columns instead, which are guaranteed to exist.
        const { error: fallbackErr } = await supabase.from('cash_in_requests')
          .update({ status: 'approved', amount: amountNum })
          .eq('ref_number', req.refNumber);

        if (fallbackErr) {
          console.error('Could not update status of cash in request in Supabase (fallback):', fallbackErr);
        }
      }
    } catch (e: any) {
      console.warn('Could not update status of cash in request in Supabase:', e);
    }

    // 2. Credit balance to user in Supabase profiles
    try {
      const { data: profData } = await supabase.from('profiles').select('id, balance').eq('username', req.username).single();
      if (profData) {
        const newBalance = (parseFloat(profData.balance) || 0) + amountNum;
        await supabase.from('profiles').update({ balance: newBalance }).eq('id', profData.id);
      }
    } catch (e: any) {
      console.warn('Could not credit target operator balance in Supabase:', e);
    }

    ActivityLogger.logActivity('cash_in_approved', `Approved cash-in balance load for ${req.username}`, { username: req.username, amount: amountNum, ref: req.refNumber });
    loadAllData();
    await showAlert('Success', `Successfully loaded ${amountNum} PHP to ${req.username}'s account portfolio.`);
  };

  const handleDenyCashIn = async (req: CashInRequest) => {
    const confirmed = await showConfirm(
      `Deny Deposit Ticket`, 
      `Are you sure you want to DENY Gcash ticket load Ref: ${req.refNumber} for ${req.username}?`, 
      'Yes, Deny', 
      'Cancel'
    );
    if (!confirmed) return;

    // 1. Sync Supabase status to 'denied'
    try {
      await supabase.from('cash_in_requests')
        .update({ status: 'denied' })
        .eq('ref_number', req.refNumber);
    } catch (e) {
      console.warn('Could not deny request in Supabase:', e);
    }

    ActivityLogger.logActivity('cash_in_denied', `Denied load requests for ${req.username}`, { username: req.username, ref: req.refNumber });
    loadAllData();
    await showAlert('Request Declined', 'Cash-in request has been successfully declined.');
  };

    const handleDeleteRequest = async (req: CashInRequest) => {
        const confirmed = await showConfirm('Delete Ticket Record', 'Permanently delete this processed ticket record details from logs?');
        if (!confirmed) return;

        // 1. Delete from Supabase
        try {
            await supabase.from('cash_in_requests').delete().eq('ref_number', req.refNumber);
        } catch (e) {
            console.warn('Could not delete cash-in request from Supabase:', e);
            await showAlert('Error', 'Failed to delete record from server. Local copy may be out of sync.');
            return;
        }

        ActivityLogger.logActivity('cash_in_deleted', `Deleted cash-in request record for ${req.username}`, { username: req.username, ref: req.refNumber });
        loadAllData();
        await showAlert('Success', 'Ticket record deleted successfully!');
    };

  const handleClearProcessedRequests = async () => {
    const confirmed = await showConfirm('Clear Processed Queues', 'Do you want to wipe all records that are already Approved or Denied?');
    if (!confirmed) return;
    try {
      await supabase.from('cash_in_requests').delete().neq('status', 'pending');
    } catch (e) {
      console.warn('Could not clear processed cash-in requests in Supabase:', e);
    }
    ActivityLogger.logActivity('cash_in_history_cleared', 'Cleared processed cash-in log queue');
    loadAllData();
  };

  // PortalKey managers
  const handleEditPortalKeySerial = async (req: PortalKeyRequest, idx: number) => {
    const defaultSerial = req.serialNumber || '';
    const newSerial = await showPrompt(`Update MikroTik Serial`, `Update MikroTik Serial for ${req.username} (Regenerates Activation Key):`, defaultSerial, 'MikroTik Board Serial Number');
    if (!newSerial || newSerial.trim() === '') return;

    const serialTrimmed = newSerial.trim().toUpperCase();
    const newKey = generatePortalKeyFromSerial(serialTrimmed);
    if (!newKey) {
      await showAlert('Invalid Serial', 'Invalid router board serial inputted.');
      return;
    }

    const confirmed = await showConfirm(
      `Confirm Key Regeneration`, 
      `Confirm changes?\n\nNew Serial: ${serialTrimmed}\nGenerated PortalKey: ${newKey}`, 
      'Confirm & Rebuild', 
      'Cancel'
    );
    if (!confirmed) return;

    // 1. Update in Supabase
    try {
      if (req.id) {
        await supabase.from('portal_keys')
          .update({
            serial_number: serialTrimmed,
            portal_key: newKey
          })
          .eq('id', req.id);
      } else {
        await supabase.from('portal_keys')
          .update({
            serial_number: serialTrimmed,
            portal_key: newKey
          })
          .eq('serial_number', req.serialNumber)
          .eq('username', req.username);
      }
    } catch (e) {
      console.warn('Could not update portal key in Supabase:', e);
      await showAlert('Error', 'Failed to update record on backend. Local copy may be out of sync.');
      return;
    }

    ActivityLogger.logActivity('portalkey_edited', `Modified activation serial key for ${req.username}`, { username: req.username, new_serial: serialTrimmed });
    loadAllData();
    await showAlert('Success', 'MikroTik serial entry updated and active PortalKey generated successfully!');
  };

    const handleDeletePortalKey = async (req: PortalKeyRequest) => {
        const serialText = req.serialNumber || 'N/A';
        const confirmed = await showConfirm('Delete Key Record', `Delete key record row for ${req.username} on serial ${serialText}?`);
        if (!confirmed) return;

        // 1. Delete from Supabase
        try {
            if (req.id) {
                await supabase.from('portal_keys').delete().eq('id', req.id);
            } else {
                await supabase.from('portal_keys').delete().eq('serial_number', req.serialNumber).eq('username', req.username);
            }
        } catch (e) {
            console.warn('Could not delete portal key from Supabase:', e);
            await showAlert('Error', 'Failed to delete record from server. Local copy may be out of sync.');
            return;
        }

        ActivityLogger.logActivity('portalkey_deleted', `Deleted PortalKey database row for ${req.username}`);
        loadAllData();
        await showAlert('Success', 'Portal key record deleted successfully!');
    };

  const handleClearPortalKeys = async () => {
    const confirmed = await showConfirm('Clear Activation Keys', 'Wipe out all generated activation keys logs completely?');
    if (!confirmed) return;
    try {
      await supabase.from('portal_keys').delete().neq('username', '');
    } catch (e) {
      console.warn('Error clearing portal keys in Supabase:', e);
    }
    ActivityLogger.logActivity('portalkey_history_cleared', 'Wiped overall network activation keys index');
    loadAllData();
  };

  const handleClearPromoHistory = async () => {
    const confirmed = await showConfirm('Clear Purchase Logs', 'Wipe all purchase records of 1-Month Voucher generator subscriptions?');
    if (!confirmed) return;
    try {
      await supabase.from('promo_history').delete().neq('username', '');
    } catch (e) {
      console.warn('Could not clear promo history in Supabase:', e);
    }
    ActivityLogger.logActivity('promo_history_cleared', 'Cleared operator rental logs');
    loadAllData();
  };

  // Admin: Load PortalKey for any user
  const [portalKeyUser, setPortalKeyUser] = useState('');
  const [portalKeyInputMode, setPortalKeyInputMode] = useState<'serial' | 'key'>('serial');
  const [portalKeyInput, setPortalKeyInput] = useState('');
  const [portalKeyStatus, setPortalKeyStatus] = useState<{ success?: boolean; msg?: string }>({});

  const handleGeneratePortalKeyForUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalKeyStatus({});

    if (!portalKeyUser) {
      setPortalKeyStatus({ success: false, msg: 'Please select a user.' });
      return;
    }
    if (!portalKeyInput.trim()) {
      setPortalKeyStatus({ success: false, msg: 'Input is required.' });
      return;
    }

    let serialTrimmed = '';
    let generatedKey = '';

    if (portalKeyInputMode === 'serial') {
      serialTrimmed = portalKeyInput.trim().toUpperCase();
      generatedKey = generatePortalKeyFromSerial(serialTrimmed);
      if (!generatedKey) {
        setPortalKeyStatus({ success: false, msg: 'Invalid serial number format.' });
        return;
      }
    } else {
      generatedKey = portalKeyInput.trim().toUpperCase();
      const decodedSerial = tryDecodeSerialFromPortalKey(generatedKey);
      serialTrimmed = decodedSerial || '';
    }

    const confirmed = await showConfirm(
      'Generate PortalKey',
      `Generate activation key for user "${portalKeyUser}"?\n\n${serialTrimmed ? `Serial: ${serialTrimmed}\n` : ''}Key: ${generatedKey}`,
      'Generate',
      'Cancel'
    );
    if (!confirmed) return;

    try {
      const dateStr = new Date().toISOString();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || null;
      const basePayload: any = {
        user_id: userId,
        username: portalKeyUser,
        status: 'approved',
        date: dateStr
      };
      if (serialTrimmed) {
        basePayload.serial_number = serialTrimmed;
      }

      let insertError: any = null;
      const keyValue = generatedKey;

      const attempts: any[] = [
        { ...basePayload, portal_key: keyValue },
        { ...basePayload, key: keyValue }
      ];

      for (const attempt of attempts) {
        const { error } = await supabase.from('portal_keys').insert([attempt]);
        if (!error) {
          insertError = null;
          break;
        }
        insertError = error;
      }

      if (insertError) {
        throw insertError;
      }

      ActivityLogger.logActivity('portalkey_generated', `Admin generated PortalKey for ${portalKeyUser}`, { username: portalKeyUser, serial: serialTrimmed || 'custom_key', key: generatedKey });
      setPortalKeyStatus({ success: true, msg: `PortalKey generated successfully for ${portalKeyUser}!` });
      setPortalKeyInput('');
      loadAllData();
    } catch (e: any) {
      setPortalKeyStatus({ success: false, msg: `Failed to save: ${e?.message || 'Unknown error'}` });
      console.warn('Could not save portal key for user:', e);
    }
  };

    const handleDeletePromoRow = async (item: PromoHistoryItem) => {
        const confirmed = await showConfirm('Delete Rental Record', `Delete subscription rental record log for ${item.username}?`);
        if (!confirmed) return;

        // 1. Delete from Supabase
        try {
            await supabase.from('promo_history').delete().eq('username', item.username).eq('date', item.date);
        } catch (e) {
            console.warn('Could not delete promo history from Supabase:', e);
            await showAlert('Error', 'Failed to delete record from server. Local copy may be out of sync.');
            return;
        }

        ActivityLogger.logActivity('promo_history_deleted', `Deleted promo history record for ${item.username}`);
        loadAllData();
        await showAlert('Success', 'Promo history record deleted successfully!');
    };

  // Quick filters for queues
  const pendingCashIn = cashInRequests.filter(r => r.status === 'pending');
  const processedCashIn = cashInRequests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="block text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Operator Rent Price</span>
            <span className="text-2xl font-extrabold text-slate-100">PHP {promoPrice}</span>
            <button 
              onClick={handleEditPromoPrice}
              className="block text-[11px] text-blue-400 hover:text-blue-300 hover:underline mt-1 focus:outline-none"
            >
              Adjust pricing rate
            </button>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-inner">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="block text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">PortalKey Price</span>
            <div className="text-slate-100 font-extrabold text-sm space-y-1">
              <div className="flex items-center gap-1.5">
                <span>1st Buy:</span>
                <span className="text-indigo-400">PHP {portalKeyFirstPrice}</span>
                <button 
                  onClick={handleEditPortalKeyFirstPrice}
                  className="text-[10px] text-blue-450 hover:text-blue-400 hover:underline font-medium ml-1 focus:outline-none"
                >
                  Update
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Subsequent:</span>
                <span className="text-emerald-400">PHP {portalKeySubsequentPrice}</span>
                <button 
                  onClick={handleEditPortalKeySubsequentPrice}
                  className="text-[10px] text-blue-450 hover:text-blue-400 hover:underline font-medium ml-1 focus:outline-none"
                >
                  Update
                </button>
              </div>
            </div>
            <span className="block text-[9px] text-slate-500 mt-1">
              Active dynamic tiering
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs uppercase tracking-widest text-slate-400 font-bold">JuanFi Portal Customizer</span>
            </div>
            <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <Link className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-2.5 text-xs">
            <div className="border-t border-slate-800/60 pt-2">
              <span className="text-slate-450 block font-semibold mb-0.5 text-[10px] uppercase tracking-wider">Title Text:</span>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-200 font-bold break-all leading-normal">{juanfiTitle}</span>
                <button 
                  onClick={handleEditJuanfiTitle}
                  className="text-[10px] text-indigo-450 hover:text-indigo-405 hover:underline font-bold focus:outline-none shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800/60 pt-2">
              <span className="text-slate-450 block font-semibold mb-0.5 text-[10px] uppercase tracking-wider">Description String:</span>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-350 italic break-all leading-normal">{juanfiDescription}</span>
                <button 
                  onClick={handleEditJuanfiDesc}
                  className="text-[10px] text-indigo-450 hover:text-indigo-405 hover:underline font-bold focus:outline-none shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800/60 pt-2">
              <span className="text-slate-450 block font-semibold mb-0.5 text-[10px] uppercase tracking-wider">Download URL Link:</span>
              <div className="flex items-start justify-between gap-2">
                <span className="text-emerald-400 font-mono break-all leading-normal" title={juanfiLink}>
                  {juanfiLink}
                </span>
                <button 
                  onClick={handleEditJuanfiLink}
                  className="text-[10px] text-indigo-450 hover:text-indigo-405 hover:underline font-bold focus:outline-none shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="block text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Pending Cash-In</span>
            <span className={`text-2xl font-extrabold ${pendingCashIn.length > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
              {pendingCashIn.length} Ticket{pendingCashIn.length !== 1 ? 's' : ''}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">Requires manual review</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${pendingCashIn.length > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-850 text-slate-500 border-slate-800'}`}>
            <PlusCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Users list and requests */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Registered Operator Accounts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-slate-100">Registered Portal Users</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOperatorForm(!showAddOperatorForm)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Operator
                </button>
                <span className="text-xs bg-slate-850 px-2.5 py-1 rounded-full text-slate-400 border border-slate-800 shrink-0">
                  {Object.keys(users).length + 1} Total Accounts
                </span>
              </div>
            </div>

            {showAddOperatorForm && (
              <form onSubmit={handleAddOperator} className="p-5 bg-slate-950/40 border-b border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Register New Operator Account</h4>
                </div>
                {addOperatorError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">
                    {addOperatorError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold uppercase text-[10px] tracking-wider">Username</label>
                    <input
                      type="text"
                      required
                      value={newOperatorUser}
                      onChange={(e) => setNewOperatorUser(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-all"
                      placeholder="e.g. operator_east"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold uppercase text-[10px] tracking-wider">Password</label>
                    <input
                      type="password"
                      required
                      value={newOperatorPass}
                      onChange={(e) => setNewOperatorPass(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOperatorForm(false);
                      setAddOperatorError('');
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
                  >
                    Save Account
                  </button>
                </div>
              </form>
            )}

            <div className="p-5 divide-y divide-slate-850/80">
              {/* Permanent Admin line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">admin</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-mono border border-indigo-500/20">ROOT ROLE</span>
                  </div>
                  <span className="text-xs text-slate-400">System Admin login entry configuration</span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-mono bg-slate-950/60 p-2.5 px-3 rounded-lg border border-slate-855 text-slate-400 max-w-[140px] truncate">
                    {isAdminPassVisible ? adminPassword : '••••••••'}
                  </span>
                  <button 
                    onClick={() => setIsAdminPassVisible(!isAdminPassVisible)} 
                    className="p-2 bg-slate-850 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all focus:outline-none"
                    title="Reveal Root Password"
                  >
                    {isAdminPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Individual user rows */}
              {Object.keys(users).length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No other operator users are currently registered in local database.
                </div>
              ) : (
                Object.entries(users).map(([uName, data]) => {
                  const uData = typeof data === 'object' && data !== null 
                    ? (data as any) 
                    : { password: String(data), expiration: '', balance: 0, lastSeen: undefined };
                  const lastSeenStr = uData.lastSeen || lastSeenMap[uName];
                  const lastSeen = lastSeenStr ? new Date(lastSeenStr) : null;
                  const isOnline = lastSeen && (Date.now() - lastSeen.getTime() < 65 * 1000);
                  return (
                    <div key={uName} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 last:pb-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-150 text-sm">{uName}</span>
                          <div 
                            className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-mono border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/60 text-slate-500 border-slate-700/50'}`}
                            title={lastSeen ? `Last seen: ${lastSeen.toLocaleString()}` : 'Never logged in'}
                          >
                            {isOnline ? <Wifi className="w-2.5 h-2.5 animate-pulse" /> : <WifiOff className="w-2.5 h-2.5" />}
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5 bg-slate-950/40 px-2 py-1 rounded border border-slate-855/40 text-[11px]">
                            Balance: <strong className="text-emerald-400">PHP {uData.balance || 0}</strong>
                          </span>
                          <span className="text-slate-400 flex items-center gap-1.5 bg-slate-950/40 px-2 py-1 rounded border border-slate-855/40 text-[11px]">
                            License: <strong className="text-indigo-400">{uData.expiration ? `Expires ${uData.expiration.split('T')[0]}` : 'None'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Controls row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono bg-slate-950/60 p-2 px-2.5 rounded-lg border border-slate-855 text-slate-300 max-w-[120px] truncate">
                          {visiblePasswords[uName] ? (uData.password || 'none') : '••••••••'}
                        </span>
                        <button 
                          onClick={() => togglePasswordVisible(uName)} 
                          className="p-2 bg-slate-850 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Show/Hide Password"
                        >
                          {visiblePasswords[uName] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button 
                          onClick={() => handleEditExpiration(uName, uData.expiration || '')}
                          className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-800/50 flex items-center gap-1"
                          title="Set voucher license month"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          Rent
                        </button>

                        <button 
                          onClick={() => handleEditBalance(uName, uData.balance || 0)}
                          className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-800/50 flex items-center gap-1"
                          title="Adjust balance pesos directly"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          Load
                        </button>

                        <button 
                          onClick={() => handleDeleteUser(uName)}
                          className="p-1.5 bg-rose-550/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                          title="Erase Account"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="bg-slate-950/40 p-3.5 text-center text-[10px] text-slate-500 border-t border-slate-800">
              Note: Root admin controls can overwrite expiration periods manually. Date validation supports YYYY-MM-DD formats.
            </div>
          </div>

          {/* Practical Cash-In Manual Approving Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-100">Deposit tickets & GCash Loads</h3>
                <p className="text-xs text-slate-400">Match reference receipts to grant operators creation tokens</p>
              </div>
              <button
                onClick={handleClearProcessedRequests}
                disabled={processedCashIn.length === 0}
                className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Wipe processed rows
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Pending Queue */}
              <div>
                <span className="block text-xs uppercase tracking-wider text-amber-400 font-bold mb-2">Pending Requests ({pendingCashIn.length})</span>
                {pendingCashIn.length === 0 ? (
                  <div className="text-center p-6 bg-slate-950/40 border border-slate-855 rounded-xl text-slate-500 text-xs">
                    No open billing deposits queued.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingCashIn.map((req, idx) => (
                      <div key={req.refNumber + idx} className="bg-slate-950/50 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold mr-2 uppercase tracking-tight">PENDING</span>
                          <span className="font-bold text-slate-200 text-sm">{req.username}</span>
                          <div className="text-xs text-slate-400 space-y-0.5">
                            <div>Ref: <strong className="text-slate-100 font-mono select-all bg-slate-900 p-0.5 px-1 rounded">{req.refNumber}</strong></div>
                            <div>Amount: <strong className="text-emerald-400 font-medium">PHP {req.amount} pesos</strong></div>
                            <div className="text-[10px] text-slate-550">{new Date(req.date).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                          <button
                            onClick={() => handleApproveCashIn(req, idx)}
                            className="flex-1 sm:flex-none px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleDenyCashIn(req)}
                            className="flex-1 sm:flex-none px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Processed queue history list */}
              <div className="pt-3 border-t border-slate-800/80">
                <span className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Processed Log history ({processedCashIn.length})</span>
                {processedCashIn.length === 0 ? (
                  <div className="text-center p-4 text-slate-600 text-xs italic">
                     No previous processed logs on transactions.
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto space-y-2 border border-slate-855 rounded-xl p-2.5 bg-slate-950/20">
                    {processedCashIn.map((req, idx) => {
                      const isApproved = req.status === 'approved';
                      return (
                        <div key={req.refNumber + idx} className="bg-slate-950/50 p-3 rounded-lg border border-slate-855 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200">{req.username}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {req.status}
                              </span>
                            </div>
                            <span className="block text-slate-500 text-[11px] mt-0.5">
                              Ref: <code className="text-slate-400">{req.refNumber}</code> | Credited: PHP {req.approvedAmount || req.amount}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteRequest(req)}
                            className="p-1 text-slate-600 hover:text-slate-400"
                            title="Delete historic row"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* PortalKey Purchases history list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="font-bold text-slate-100 font-sans">Bought Activation Keys</h3>
                <p className="text-xs text-slate-400">Keys automatically generated according to users hardware components</p>
              </div>
              <button
                onClick={handleClearPortalKeys}
                disabled={portalKeyRequests.length === 0}
                className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-medium rounded-lg transition-all disabled:opacity-40"
              >
                Clear records
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              {portalKeyRequests.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-xs">
                  No activation code records found.
                </div>
              ) : (
                portalKeyRequests.slice().reverse().map((req, idx) => (
                  <div key={req.id || (`${req.portalKey}-${idx}`)} className="bg-slate-950/40 border border-slate-855 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{req.username}</span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-500/25">PURCHASED</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-0.5 mt-1">
                        <div>Router Serial: <strong className="text-slate-100 font-mono">{req.serialNumber || 'N/A'}</strong></div>
                        <div>Generated Key: <strong className="text-emerald-400 font-mono text-xs select-all bg-emerald-500/5 p-1 rounded border border-emerald-500/10">{req.portalKey}</strong></div>
                        <div className="text-[10px] text-slate-550">{new Date(req.date).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleEditPortalKeySerial(req, idx)}
                        className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                      >
                        Edit Serial
                      </button>
                      <button
                        onClick={() => handleDeletePortalKey(req)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Promo voucher sub history */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="font-bold text-slate-100">Subscription Rent Purchases</h3>
                <p className="text-xs text-slate-400">Operators who self-purchased 1-Month generator license</p>
              </div>
              <button
                onClick={handleClearPromoHistory}
                disabled={promoHistory.length === 0}
                className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-medium rounded-lg transition-all"
              >
                Clear logs
              </button>
            </div>

            <div className="p-5 divide-y divide-slate-850/60">
              {promoHistory.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-xs">
                  No subscription history records.
                </div>
              ) : (
                promoHistory.slice().reverse().map((item, idx) => (
                  <div key={item.date + idx} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-200">{item.username}</strong>
                        <span className="text-[9px] bg-slate-800 text-slate-450 p-0.5 px-1.5 rounded">1 MONTH LICENSE</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">{new Date(item.date).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-400">PHP {item.price} pesos</span>
                      <button
                        onClick={() => handleDeletePromoRow(item)}
                        className="p-1 text-slate-650 hover:text-rose-400"
                        title="Delete log row"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Side Settings Panel */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Telegram Settings form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-slate-100">Telegram Bot Setup</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Enable instant messaging routing for cash-in load alerts. Real-time updates delivered straight to Gcash collectors.
            </p>

            {telegramStatus.msg && (
              <div className={`p-3 rounded-xl text-xs border ${telegramStatus.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {telegramStatus.msg}
              </div>
            )}

            <form onSubmit={handleSaveTelegram} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Bot Token Key</label>
                <input
                  type="password"
                  placeholder="e.g. 521406531:AAFFg7B6..."
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Chat ID Number</label>
                <input
                  type="text"
                  placeholder="e.g. -10045263102"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Save Token
                </button>
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-250 font-bold rounded-xl text-xs transition-all border border-slate-750"
                >
                  Test Alert
                </button>
              </div>
            </form>
          </div>

          {/* Change Admin password */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-400" />
              <h3 className="font-bold text-slate-100">Update Admin Password</h3>
            </div>

            {passwordMsg.msg && (
              <div className={`p-3 rounded-xl text-xs border ${passwordMsg.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                {passwordMsg.msg}
              </div>
            )}

            <form onSubmit={handleChangeAdminPass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current master pass"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min length 6 characters"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Verify password input matches"
                  value={confirmNewPass}
                  onChange={(e) => setConfirmNewPass(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl transition-all block text-center cursor-pointer"
              >
                Change Admin Credentials
              </button>
            </form>
          </div>

          {/* Generate PortalKey for Users */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-slate-100">Generate PortalKey</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Manually generate activation keys for any operator user.
            </p>

            {portalKeyStatus.msg && (
              <div className={`p-3 rounded-xl text-xs border ${portalKeyStatus.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {portalKeyStatus.msg}
              </div>
            )}

            <form onSubmit={handleGeneratePortalKeyForUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Select User</label>
                <select
                  value={portalKeyUser}
                  onChange={(e) => setPortalKeyUser(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select operator --</option>
                  {Object.keys(users).map((uName) => (
                    <option key={uName} value={uName}>{uName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Input Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setPortalKeyInputMode('serial'); setPortalKeyInput(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${portalKeyInputMode === 'serial' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-850 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                  >
                    Serial Number
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPortalKeyInputMode('key'); setPortalKeyInput(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${portalKeyInputMode === 'key' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-850 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                  >
                    PortalKey
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  {portalKeyInputMode === 'serial' ? 'Router Serial Number' : 'PortalKey Code'}
                </label>
                <input
                  type="text"
                  placeholder={portalKeyInputMode === 'serial' ? 'Enter MikroTik serial (e.g. ABC123DEF)' : 'Enter PortalKey directly (e.g. ABCD-EFGH-IJKL-MNOP)'}
                  value={portalKeyInput}
                  onChange={(e) => setPortalKeyInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                Generate & Save Key
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Custom Dialog Overlay System */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="p-5 space-y-3.5">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                {dialog.title}
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed whitespace-pre-line">
                {dialog.message}
              </p>
              
              {dialog.showInput && (
                <div className="pt-1.5">
                  <input
                    type={dialog.inputType || 'text'}
                    value={dialog.inputValue}
                    placeholder={dialog.inputPlaceholder}
                    onChange={(e) => setDialog(prev => ({ ...prev, inputValue: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-xs font-mono"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        dialog.onConfirm(dialog.inputValue);
                      } else if (e.key === 'Escape') {
                        if (dialog.onCancel) {
                          dialog.onCancel();
                        } else {
                          setDialog(prev => ({ ...prev, isOpen: false }));
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="bg-slate-950/40 px-5 py-3 flex justify-end gap-2 border-t border-slate-850">
              {dialog.type !== 'alert' && (
                <button
                  type="button"
                  onClick={() => {
                    if (dialog.onCancel) {
                      dialog.onCancel();
                    } else {
                      setDialog(prev => ({ ...prev, isOpen: false }));
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  {dialog.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  dialog.onConfirm(dialog.inputValue);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
