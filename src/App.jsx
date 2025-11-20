import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import {
    getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, deleteDoc,
    collection, query, where, serverTimestamp, getDocs,
    runTransaction, increment, limit, orderBy, startAfter
} from 'firebase/firestore';
import {
    Users, Coins, Video, Link, Globe, MonitorPlay, Zap,
    UserPlus, ChevronLeft, BookOpen, ShoppingCart,
    CalendarCheck, Target, Wallet, Film, UserCheck,
    DollarSign, LogOut, Mail, Lock, CheckSquare, Edit, Trash2,
    Settings, Copy, Save, Search, PlusCircle, MinusCircle,
    CheckCircle, XCircle, RefreshCw, User, ExternalLink, TrendingUp,
    ArrowUpRight, ArrowDownLeft, Clock, ChevronDown, Image as ImageIcon, LogIn,
    Youtube, Bell, AlertTriangle, MessageCircle
} from 'lucide-react';

// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDw-b18l9BgIv61DFBxWAFbP6Mh_HsBv24",
    authDomain: "we4u-e1134.firebaseapp.com",
    projectId: "we4u-e1134",
    storageBucket: "we4u-e1134.firebasestorage.app",
    messagingSenderId: "302631685264",
    appId: "1:302631685264:web:940365e03d08b715719c15",
    measurementId: "G-NN4S9Z8SB9"
};

const appId = 'we4u_live_app';

// --- 2. FIREBASE INITIALIZATION ---
let app, db, auth;
try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// --- 3. HELPER FUNCTIONS & KHQR GENERATOR ---
const getTodayDateKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getShortId = (id) => id?.substring(0, 6).toUpperCase() || '------';
const formatNumber = (num) => num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';

const getYouTubeID = (url) => {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
};

const getEmbedUrl = (url) => {
    const videoId = getYouTubeID(url);
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1&modestbranding=1`;
    }
    return null;
};

// --- KHQR LOGIC (STANDARD) ---
const crc16 = (str) => {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
            crc = crc & 0xFFFF; 
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
};

const formatTag = (id, value) => {
    const len = value.length;
    const lenStr = len.toString().padStart(2, '0');
    return id + lenStr + value;
};

const generateKhqr = (bakongId, amount, merchantName = "KH Market") => {
    const tag29Content = formatTag("00", "kh.com.bakong") + formatTag("01", bakongId);
    
    const tags = [
        formatTag("00", "01"),              // Payload Format
        formatTag("01", "12"),              // Point of Initiation (Dynamic)
        formatTag("29", tag29Content),      // Merchant Account Info
        formatTag("52", "5999"),            // MCC
        formatTag("53", "840"),             // Currency (USD)
        formatTag("54", parseFloat(amount).toFixed(2)), // Amount
        formatTag("58", "KH"),              // Country Code
        formatTag("59", merchantName),      // Merchant Name
        formatTag("60", "PHNOM PENH"),      // City
    ];

    let qrString = tags.join("") + "6304"; // CRC Tag
    return qrString + crc16(qrString);
};

// Firestore Paths
const getProfileDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'profile', 'user_data') : null;
const getCampaignsCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'campaigns') : null;
const getReferralCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'referrals') : null;
const getDailyStatusDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'daily_status', getTodayDateKey()) : null;
const getGlobalConfigDocRef = () => db ? doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings') : null;
const getShortCodeDocRef = (shortId) => db && shortId ? doc(db, 'artifacts', appId, 'public', 'data', 'short_codes', shortId) : null;
const getHistoryCollectionRef = (userId) => db && userId ? collection(db, 'artifacts', appId, 'users', userId, 'history') : null;

// Default Config
const defaultGlobalConfig = {
    dailyCheckinReward: 50,
    signupBonus: 100,
    referrerReward: 200,
    referredBonus: 100,
    adsReward: 25,
    maxDailyAds: 15,
    enableBuyCoins: false,
    enableWithdraw: true, 
    exchangeRate: 10000,
    minTasksForWithdraw: 50,
    withdrawalOptions: [2, 5, 7, 10],
    adsSettings: {
        bannerId: "", 
        interstitialId: "", 
        directLinkUrl: "https://google.com", 
        bannerImgUrl: "", 
        bannerClickUrl: "",
        isEnabled: true
    },
    welcomePopup: {
        isEnabled: true,
        title: "សួស្តី!",
        message: "ជួយគ្នាដើម្បីជោគជ័យទាំងអស់គ្នា"
    },
    coinPackages: [
        { id: 1, coins: 5000, price: '$1.00', color: 'bg-green-500' },
        { id: 2, coins: 15000, price: '$3.00', color: 'bg-blue-500' },
        { id: 3, coins: 50000, price: '$10.00', color: 'bg-purple-500' },
        { id: 4, coins: 150000, price: '$30.00', color: 'bg-red-500' },
    ]
};

// --- 4. SHARED UI COMPONENTS ---
const Loading = () => (
    <div className="flex justify-center items-center h-screen bg-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400"></div>
        <span className="ml-3 text-white text-lg font-semibold">កំពុងផ្ទុក...</span>
    </div>
);

const IconButton = ({ icon: Icon, title, onClick, iconColor = 'text-purple-300', textColor = 'text-white', disabled = false }) => (
    <button
        onClick={!disabled ? onClick : undefined}
        disabled={disabled}
        className={`flex flex-col items-center justify-start p-2 rounded-xl transition transform w-full h-32 border
        ${disabled ? 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-70' : 'bg-purple-800 shadow-lg border-purple-700 hover:scale-105 active:scale-95'}`}
    >
        <div className={`p-3 rounded-xl ${disabled ? 'bg-gray-700' : 'bg-purple-900 shadow-inner'}`}>
            <Icon className={`w-8 h-8 ${disabled ? 'text-gray-500' : iconColor}`} />
        </div>
        <span className={`mt-2 text-xs font-bold text-center ${disabled ? 'text-gray-500' : textColor} break-words leading-tight`}>{title}</span>
    </button>
);

const Card = ({ children, className = '' }) => (
    <div className={`bg-purple-800 rounded-xl shadow-xl border border-purple-700 text-white ${className}`}>{children}</div>
);

const Header = ({ title, onBack, rightContent, className = '' }) => (
    <header className={`flex items-center justify-between p-4 bg-purple-950 shadow-md text-white fixed top-0 w-full z-20 border-b border-purple-800 ${className}`}>
        <div className="flex items-center">
            {onBack && (
                <button onClick={onBack} className="p-1 mr-2 rounded-full hover:bg-purple-800 transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            <h1 className="text-xl font-bold">{title}</h1>
        </div>
        {rightContent}
    </header>
);

const InputField = (props) => (
    <input
        {...props}
        className={`w-full p-3 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-400 focus:outline-none focus:border-yellow-400 ${props.className || ''}`}
    />
);

const SelectionModal = ({ isOpen, onClose, title, options, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-xs p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-bold text-lg text-gray-800 text-center">{title}</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {options.map((opt, index) => (
                        <button 
                            key={opt} 
                            onClick={() => { onSelect(opt); onClose(); }} 
                            className={`w-full py-4 text-lg font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition border-b border-gray-100 last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                   <button onClick={onClose} className="text-red-500 font-bold text-sm px-6 py-2 rounded-full hover:bg-red-50 transition">CANCEL</button>
                </div>
            </div>
        </div>
    );
};

const WelcomeModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
            <div className="bg-orange-500 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative border-2 border-orange-400">
                <div className="p-6 text-center flex flex-col items-center">
                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
                        <MessageCircle size={32} className="text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-extrabold mb-2 text-white drop-shadow-md">{title || "សួស្តី!"}</h3>
                    <p className="text-white font-medium text-lg leading-relaxed opacity-95">{message || "សូមស្វាគមន៍"}</p>
                </div>
                <div className="p-4 bg-orange-600/20 border-t border-orange-400/30">
                    <button onClick={onClose} className="w-full bg-white hover:bg-gray-100 text-orange-600 font-extrabold py-3 rounded-xl shadow-lg transition transform active:scale-95">
                        យល់ព្រម (OK)
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 5. ADMIN PAGES ---

const AdminSettingsTab = ({ config, setConfig, onSave }) => {
    const [withdrawStr, setWithdrawStr] = useState(config.withdrawalOptions?.join(', ') || '2, 5, 7, 10');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    };

    const handleToggleChange = () => {
        setConfig(prev => ({ ...prev, enableBuyCoins: !prev.enableBuyCoins }));
    };

    const handleWithdrawToggle = () => {
        setConfig(prev => ({ ...prev, enableWithdraw: !prev.enableWithdraw }));
    };

    const handleAdsChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            adsSettings: { ...prev.adsSettings, [name]: value }
        }));
    };
    
    const handlePopupChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            welcomePopup: { ...prev.welcomePopup, [name]: value }
        }));
    };
    
    const handlePopupToggle = () => {
        setConfig(prev => ({
            ...prev,
            welcomePopup: { ...prev.welcomePopup, isEnabled: !prev.welcomePopup?.isEnabled }
        }));
    };

    const handlePackageChange = (index, field, value) => {
        const newPackages = config.coinPackages ? [...config.coinPackages] : [];
        if (newPackages[index]) {
            newPackages[index][field] = field === 'coins' ? (parseInt(value) || 0) : value;
            setConfig(prev => ({ ...prev, coinPackages: newPackages }));
        }
    };

    const handleWithdrawStrChange = (e) => {
        setWithdrawStr(e.target.value);
    };

    const handleWithdrawBlur = () => {
        const arr = withdrawStr.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n) && n > 0);
        setConfig(prev => ({ ...prev, withdrawalOptions: arr }));
    };

    return (
        <div className="space-y-4 pb-10">
            <Card className="p-4 border-l-4 border-orange-500">
                <h3 className="font-bold text-lg mb-3 text-orange-400 flex items-center"><MessageCircle className="w-5 h-5 mr-2"/> Pop-up ពេលចូល (Welcome Message)</h3>
                <div className="flex items-center justify-between bg-purple-900/50 p-3 rounded-lg border border-purple-600 mb-3">
                    <span className="text-white font-bold">បង្ហាញ Pop-up</span>
                    <button onClick={handlePopupToggle} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${config.welcomePopup?.isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${config.welcomePopup?.isEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>
                <div className="space-y-2">
                    <div>
                        <label className="text-xs text-purple-300">ចំណងជើង (Title)</label>
                        <InputField name="title" value={config.welcomePopup?.title || ''} onChange={handlePopupChange} placeholder="សួស្តី!" />
                    </div>
                    <div>
                        <label className="text-xs text-purple-300">ខ្លឹមសារ (Message)</label>
                        <textarea 
                            name="message"
                            value={config.welcomePopup?.message || ''} 
                            onChange={handlePopupChange}
                            placeholder="សរសេរសារនៅទីនេះ..."
                            className="w-full p-3 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-400 focus:outline-none focus:border-yellow-400 h-24"
                        />
                    </div>
                </div>
            </Card>
             {/* Other settings components are similar to previous version */}
            <button onClick={onSave} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex justify-center items-center transition">
                <Save className="w-5 h-5 mr-2"/> រក្សាទុកការកំណត់ (SAVE ALL)
            </button>
        </div>
    );
};

const AdminUserManagerTab = ({ db, showNotification }) => {
    const [searchId, setSearchId] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [pointsToAdd, setPointsToAdd] = useState(0);
    const [balanceToAdd, setBalanceToAdd] = useState(0);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const loadUserList = async (isLoadMore = false) => {
        if (isLoadMore && !lastDoc) return;
        setLoadingList(true);
        try {
            const shortCodesRef = collection(db, 'artifacts', appId, 'public', 'data', 'short_codes');
            let q = isLoadMore ? query(shortCodesRef, limit(50), startAfter(lastDoc)) : query(shortCodesRef, limit(50));
            const snap = await getDocs(q);
            if (snap.empty) { setHasMore(false); setLoadingList(false); return; }

            const usersData = await Promise.all(snap.docs.map(async (docSnap) => {
                const { fullUserId } = docSnap.data();
                if(!fullUserId) return null;
                const profileSnap = await getDoc(getProfileDocRef(fullUserId));
                if (profileSnap.exists()) return { ...profileSnap.data(), uid: fullUserId };
                return null;
            }));
            
            const validUsers = usersData.filter(u => u !== null);
            setAllUsers(prev => isLoadMore ? [...prev, ...validUsers] : validUsers);
            setLastDoc(snap.docs[snap.docs.length - 1]);
            setHasMore(snap.docs.length >= 50);
        } catch (e) { console.error(e); }
        setLoadingList(false);
    };

    useEffect(() => { loadUserList(); }, []);

    const handleSearch = async () => {
        if(searchId.length !== 6) return showNotification('Please enter 6-digit Short ID', 'error');
        try {
            const shortCodeDoc = await getDoc(getShortCodeDocRef(searchId.toUpperCase()));
            if(shortCodeDoc.exists()){
                const uid = shortCodeDoc.data().fullUserId;
                const profile = await getDoc(getProfileDocRef(uid));
                if(profile.exists()) setFoundUser({ uid, ...profile.data() });
            } else {
                showNotification('User not found', 'error');
                setFoundUser(null);
            }
        } catch(e) { console.error(e); }
    };

    const handleUpdatePoints = async () => {
        if(!foundUser) return;
        try {
            await updateDoc(getProfileDocRef(foundUser.uid), { points: increment(parseInt(pointsToAdd)) });
            showNotification('Points updated', 'success');
            setFoundUser(prev => ({...prev, points: prev.points + parseInt(pointsToAdd)}));
            setPointsToAdd(0);
        } catch(e) { showNotification('Failed', 'error'); }
    };

    const handleUpdateBalance = async () => {
        if(!foundUser) return;
        const amount = parseFloat(balanceToAdd);
        try {
            await updateDoc(getProfileDocRef(foundUser.uid), { balance: increment(amount) });
            showNotification('Balance updated', 'success');
            setFoundUser(prev => ({...prev, balance: (prev.balance || 0) + amount}));
            setBalanceToAdd(0);
        } catch(e) { showNotification('Failed', 'error'); }
    };

    const handleDeleteUser = async (targetUid, targetShortId) => {
        if(!window.confirm('Delete this user?')) return;
        try {
            if(targetUid) await deleteDoc(getProfileDocRef(targetUid));
            if(targetShortId) await deleteDoc(getShortCodeDocRef(targetShortId));
            showNotification('User deleted', 'success');
            setFoundUser(null);
            loadUserList(false);
        } catch (e) { showNotification('Failed: ' + e.message, 'error'); }
    };

    return (
        <div className='space-y-4 pb-10'>
            <Card className="p-4">
                <h3 className="font-bold text-lg mb-4 text-white">ស្វែងរក & កែប្រែ (Manage User)</h3>
                <div className="flex space-x-2 mb-4">
                    <InputField value={searchId} onChange={e => setSearchId(e.target.value.toUpperCase())} placeholder="Enter ID" className="uppercase font-mono" maxLength={6} />
                    <button onClick={handleSearch} className="bg-blue-600 text-white p-2 rounded-lg"><Search/></button>
                </div>
                {foundUser && (
                    <div className="bg-purple-900 p-4 rounded-lg border border-purple-600 relative space-y-4">
                        <button onClick={() => handleDeleteUser(foundUser.uid, foundUser.shortId)} className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-lg"><Trash2 size={20} /></button>
                        <div><p className="font-bold text-lg">{foundUser.userName}</p><p className="text-sm text-purple-300">{foundUser.email}</p></div>
                        <div className="bg-purple-800/50 p-3 rounded border border-purple-700">
                            <p className="text-xs mb-1">Points</p>
                            <p className="font-bold text-2xl text-yellow-400 mb-2">{formatNumber(foundUser.points)}</p>
                            <div className="flex space-x-2"><InputField type="number" value={pointsToAdd} onChange={e => setPointsToAdd(e.target.value)} placeholder="+/- Points" /><button onClick={handleUpdatePoints} className="bg-yellow-600 px-4 rounded">Update</button></div>
                        </div>
                        <div className="bg-purple-800/50 p-3 rounded border border-green-700">
                            <p className="text-xs mb-1">Balance ($)</p>
                            <p className="font-bold text-2xl text-green-400 mb-2">${(foundUser.balance || 0).toFixed(4)}</p>
                            <div className="flex space-x-2"><InputField type="number" step="0.01" value={balanceToAdd} onChange={e => setBalanceToAdd(e.target.value)} placeholder="+/- USD" /><button onClick={handleUpdateBalance} className="bg-green-600 px-4 rounded">Update</button></div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

const AdminWithdrawalsTab = ({ db, showNotification }) => {
    const [withdrawals, setWithdrawals] = useState([]);
    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), orderBy('date', 'desc'), limit(50));
        return onSnapshot(q, (snap) => setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [db]);

    const handleAction = async (item, action) => {
        if(!window.confirm(action === 'approved' ? 'Approve?' : 'Reject?')) return;
        try {
            await runTransaction(db, async (tx) => {
                const withdrawRef = doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', item.id);
                if (action === 'rejected') {
                    const userRef = getProfileDocRef(item.userId);
                    tx.update(userRef, { balance: increment(item.amount) });
                    const historyRef = doc(collection(db, 'artifacts', appId, 'users', item.userId, 'history'));
                    tx.set(historyRef, { title: 'Withdrawal Rejected (Refund)', amount: 0, moneyEarned: item.amount, date: serverTimestamp(), type: 'refund' });
                }
                tx.update(withdrawRef, { status: action });
            });
            showNotification(`Success: ${action.toUpperCase()}`, 'success');
        } catch(e) { showNotification(e.message, 'error'); }
    };

    return (
        <div className="space-y-3 pb-10">
            {withdrawals.map(w => (
                <div key={w.id} className={`p-3 rounded-lg border ${w.status === 'pending' ? 'bg-purple-800 border-yellow-500' : 'bg-gray-800 border-gray-700 opacity-70'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${w.status === 'pending' ? 'bg-yellow-500 text-black' : w.status === 'approved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{w.status.toUpperCase()}</span>
                            <p className="font-bold text-white">{w.userName}</p>
                            <p className="text-green-400 font-bold">${formatNumber(w.amount)}</p>
                            <div className="text-xs text-purple-200 mt-1 bg-purple-900/50 p-2 rounded">
                                <p>Bank: {w.bankName} | Acc: {w.accountNumber}</p>
                                <p>Name: {w.accountName}</p>
                            </div>
                        </div>
                        {w.status === 'pending' && (
                            <div className="flex flex-col space-y-2">
                                <button onClick={() => handleAction(w, 'approved')} className="bg-green-600 text-white p-2 rounded text-xs font-bold">APPROVE</button>
                                <button onClick={() => handleAction(w, 'rejected')} className="bg-red-600 text-white p-2 rounded text-xs font-bold">REJECT</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const AdminDepositsTab = ({ db, showNotification }) => {
    const [deposits, setDeposits] = useState([]);
    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'deposits'), orderBy('date', 'desc'), limit(50));
        return onSnapshot(q, (snap) => setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [db]);

    const handleApprove = async (item) => {
        if(!window.confirm(`Approve ${item.coins} Coins for ${item.userName}?`)) return;
        try {
            await runTransaction(db, async (tx) => {
                const depositRef = doc(db, 'artifacts', appId, 'public', 'data', 'deposits', item.id);
                const userRef = getProfileDocRef(item.userId);
                tx.update(userRef, { points: increment(item.coins), totalEarned: increment(item.coins) });
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', item.userId, 'history'));
                tx.set(historyRef, { title: 'Buy Coins (Approved)', amount: item.coins, moneyEarned: 0, date: serverTimestamp(), type: 'deposit' });
                tx.update(depositRef, { status: 'approved' });
            });
            showNotification('Approved & Coins Added!', 'success');
        } catch(e) { showNotification(e.message, 'error'); }
    };

    const handleReject = async (id) => {
        if(!window.confirm('Reject?')) return;
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deposits', id), { status: 'rejected' }); showNotification('Rejected!', 'success'); }
        catch(e) { showNotification(e.message, 'error'); }
    };

    return (
        <div className="space-y-3 pb-10">
            {deposits.map(d => (
                <div key={d.id} className={`p-3 rounded-lg border ${d.status === 'pending' ? 'bg-purple-800 border-green-500' : 'bg-gray-800 border-gray-700 opacity-70'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${d.status === 'pending' ? 'bg-yellow-500 text-black' : d.status === 'approved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{d.status.toUpperCase()}</span>
                            <p className="text-white font-bold text-sm">{d.userName}</p>
                            <p className="text-yellow-400 font-bold text-lg mt-1">+{formatNumber(d.coins)} Coins</p>
                            <div className="text-xs text-purple-200 mt-1 bg-purple-900/50 p-2 rounded"><p>Price: {d.price}</p><p>Trx ID: {d.transactionId}</p></div>
                        </div>
                        {d.status === 'pending' && (
                            <div className="flex flex-col space-y-2">
                                <button onClick={() => handleApprove(d)} className="bg-green-600 text-white p-2 rounded text-xs font-bold">APPROVE</button>
                                <button onClick={() => handleReject(d.id)} className="bg-red-600 text-white p-2 rounded text-xs font-bold">REJECT</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const AdminDashboardPage = ({ db, setPage, showNotification }) => {
    const [activeTab, setActiveTab] = useState('SETTINGS');
    const [config, setConfig] = useState(null);
    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docSnap = await getDoc(getGlobalConfigDocRef());
                setConfig(docSnap.exists() ? { ...defaultGlobalConfig, ...docSnap.data() } : defaultGlobalConfig);
            } catch(e) { setConfig(defaultGlobalConfig); }
        };
        fetchConfig();
    }, [db]);

    useEffect(() => {
        if(activeTab === 'CAMPAIGNS') {
            const q = query(getCampaignsCollectionRef(), limit(50));
            return onSnapshot(q, (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        }
    }, [db, activeTab]);

    const handleSaveConfig = async () => {
        try { await setDoc(getGlobalConfigDocRef(), config); showNotification('Saved!', 'success'); }
        catch(e) { showNotification('Failed', 'error'); }
    };

    const handleDeleteCampaign = async (id) => {
        if(window.confirm('Stop this campaign?')) {
             try { await deleteDoc(doc(getCampaignsCollectionRef(), id)); showNotification('Deleted!', 'success'); } catch(e) {}
        }
    };

    if (!config) return <Loading />;

    return (
        <div className="min-h-screen bg-purple-950 pb-16 pt-20">
            <Header title="ADMIN PANEL" onBack={() => setPage('DASHBOARD')} className="bg-purple-900" />
            <main className="p-4">
                <div className="flex space-x-1 mb-4 bg-purple-800 p-1 rounded-lg overflow-x-auto">
                    {['SETTINGS', 'USERS', 'CAMPAIGNS', 'DEPOSITS', 'WITHDRAWALS'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-2 rounded-lg font-bold text-[10px] whitespace-nowrap transition ${activeTab === tab ? 'bg-teal-600 text-white shadow' : 'text-purple-300 hover:bg-purple-700'}`}>{tab}</button>
                    ))}
                </div>
                {activeTab === 'SETTINGS' && <AdminSettingsTab config={config} setConfig={setConfig} onSave={handleSaveConfig} />}
                {activeTab === 'USERS' && <AdminUserManagerTab db={db} showNotification={showNotification} />}
                {activeTab === 'DEPOSITS' && <AdminDepositsTab db={db} showNotification={showNotification} />}
                {activeTab === 'WITHDRAWALS' && <AdminWithdrawalsTab db={db} showNotification={showNotification} />}
                {activeTab === 'CAMPAIGNS' && (
                    <div className="space-y-2 pb-10">
                        {campaigns.map(c => (
                            <div key={c.id} className="bg-purple-800 p-3 rounded-lg shadow flex justify-between items-center border-l-4 border-blue-500">
                                <div className="overflow-hidden"><p className="font-bold text-sm truncate text-white">{c.link}</p><p className="text-xs text-gray-300">Rem: {c.remaining}</p></div>
                                <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 bg-red-600 text-white rounded-full"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
// --- 6. USER PAGES ---

const ReferralPage = ({ db, userId, userProfile, showNotification, setPage, globalConfig }) => {
    const [referrals, setReferrals] = useState([]);
    const [inputCode, setInputCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const shortId = getShortId(userId);

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(getReferralCollectionRef(), where('referrerId', '==', userId));
        const unsub = onSnapshot(q, (snap) => setReferrals(snap.docs.map(d => d.data())));
        return () => unsub();
    }, [db, userId]);

    const handleSubmitCode = async () => {
        const code = inputCode.toUpperCase().trim();
        if (code.length !== 6 || code === shortId || userProfile.referredBy) return showNotification('Invalid Code', 'error');
        setIsSubmitting(true);
        try {
            await runTransaction(db, async (transaction) => {
                const shortCodeRef = getShortCodeDocRef(code);
                const shortCodeDoc = await transaction.get(shortCodeRef);
                if (!shortCodeDoc.exists()) throw new Error("Invalid Code");
                const referrerId = shortCodeDoc.data().fullUserId;
                
                transaction.update(getProfileDocRef(referrerId), { points: increment(globalConfig.referrerReward), totalEarned: increment(globalConfig.referrerReward) });
                const referrerHistoryRef = doc(collection(db, 'artifacts', appId, 'users', referrerId, 'history'));
                transaction.set(referrerHistoryRef, { title: 'Referral Reward', amount: globalConfig.referrerReward, date: serverTimestamp(), type: 'referral' });

                const bonus = globalConfig.referredBonus || 500;
                transaction.update(getProfileDocRef(userId), { referredBy: code, points: increment(bonus), totalEarned: increment(bonus) });
                const myHistoryRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(myHistoryRef, { title: 'Entered Code Bonus', amount: bonus, date: serverTimestamp(), type: 'referral_code' });

                const newReferralRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'referrals'));
                transaction.set(newReferralRef, { referrerId: referrerId, referredUserId: userId, referredName: userProfile.userName || 'Unknown', reward: globalConfig.referrerReward, timestamp: serverTimestamp() });
            });
            showNotification(`Success! +${globalConfig.referredBonus} Points`, 'success');
            setInputCode('');
        } catch (e) { showNotification(e.message, 'error'); }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="ណែនាំមិត្ត" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <Card className="p-6 text-center bg-purple-800 border-2 border-yellow-500/50">
                    <h3 className="font-bold text-white text-lg">កូដណែនាំរបស់អ្នក</h3>
                    <div className="text-4xl font-mono font-extrabold text-yellow-400 my-4 bg-purple-900 p-2 rounded-lg">{shortId}</div>
                    <button onClick={() => {navigator.clipboard.writeText(shortId); showNotification('Copied!', 'success')}} className="bg-teal-600 text-white px-6 py-2 rounded-full font-bold flex items-center justify-center mx-auto"><Copy className='w-4 h-4 mr-2'/> Copy</button>
                </Card>
                <Card className="p-4 border border-teal-500/30">
                    <h3 className="font-bold text-white mb-2">ដាក់កូដអ្នកណែនាំ</h3>
                    {userProfile.referredBy ? <div className="text-green-400 text-center font-bold">Referred by: {userProfile.referredBy}</div> : (
                        <div className="flex"><input value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={6} className="flex-1 p-3 text-black font-bold rounded-l-lg uppercase" /><button onClick={handleSubmitCode} disabled={isSubmitting} className="px-6 font-bold text-white bg-yellow-600 rounded-r-lg">OK</button></div>
                    )}
                </Card>
            </main>
        </div>
    );
};

const MyCampaignsPage = ({ db, userId, userProfile, setPage, showNotification }) => {
    const [type, setType] = useState('view');
    const [link, setLink] = useState('');
    const [count, setCount] = useState(10);
    const [time, setTime] = useState(60);
    const [userCampaigns, setUserCampaigns] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLinkVerified, setIsLinkVerified] = useState(false);
    const [showViewPicker, setShowViewPicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('userId', '==', userId));
        return onSnapshot(q, (snap) => setUserCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)));
    }, [db, userId]);

    const calculateCost = useCallback(() => { return type === 'sub' ? (parseInt(count) * 50) : (parseInt(count) * parseInt(time) * 1); }, [type, count, time]);

    const handleCheckLink = (e) => {
        e.preventDefault();
        if(!link.trim()) return showNotification('Enter Link', 'error');
        if ((type === 'view' || type === 'sub') && !getYouTubeID(link)) return showNotification('Invalid YouTube Link', 'error');
        setIsLinkVerified(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cost = calculateCost();
        if (cost > userProfile.points) return showNotification('Insufficient Points', 'error');
        setIsSubmitting(true);
        try {
            await runTransaction(db, async (transaction) => {
                const profileRef = getProfileDocRef(userId);
                const profileDoc = await transaction.get(profileRef);
                if (profileDoc.data().points < cost) throw new Error("Insufficient points");
                transaction.update(profileRef, { points: increment(-cost) });
                const newCampRef = doc(getCampaignsCollectionRef());
                transaction.set(newCampRef, { userId, type, link: link.trim(), costPerUnit: type === 'sub' ? 50 : 1, requiredDuration: type === 'sub' ? 60 : parseInt(time), initialCount: parseInt(count), remaining: parseInt(count), totalCost: cost, createdAt: serverTimestamp(), isActive: true });
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(historyRef, { title: `Create ${type.toUpperCase()} Campaign`, amount: -cost, date: serverTimestamp(), type: 'campaign' });
            });
            showNotification('Campaign Created!', 'success');
            setLink(''); setIsLinkVerified(false);
        } catch (error) { showNotification(error.message, 'error'); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] pb-16 pt-20">
            <Header title="យុទ្ធនាការខ្ញុំ" onBack={() => setPage('DASHBOARD')} />
            <main className="px-4 space-y-4">
                <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700 shadow-lg">
                    <div className="flex space-x-2 mb-4">{['view', 'sub', 'website'].map(t => (<button key={t} onClick={() => {setType(t); setIsLinkVerified(false);}} className={`flex-1 py-2 rounded font-bold text-xs ${type === t ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-400'}`}>{t.toUpperCase()}</button>))}</div>
                    <form onSubmit={isLinkVerified ? handleSubmit : handleCheckLink} className="space-y-3">
                        <div className="flex shadow-sm"><input value={link} onChange={e => {setLink(e.target.value); setIsLinkVerified(false);}} placeholder="Link..." required disabled={isLinkVerified} className="flex-1 p-3 bg-white text-black rounded-l-lg" /><button type={isLinkVerified ? 'button' : 'submit'} onClick={isLinkVerified ? () => {setLink(''); setIsLinkVerified(false);} : undefined} className={`px-4 font-bold text-white rounded-r-lg ${isLinkVerified ? 'bg-red-600' : 'bg-blue-600'}`}>{isLinkVerified ? <XCircle/> : <Search/>}</button></div>
                        {isLinkVerified && (
                            <div className="space-y-2">
                                <div className="flex justify-between bg-gray-800 p-3 rounded"><span className="text-gray-300">Count</span><div onClick={() => setShowViewPicker(true)} className="text-teal-400 font-bold cursor-pointer">{count} <ChevronDown size={16}/></div></div>
                                {type !== 'sub' && <div className="flex justify-between bg-gray-800 p-3 rounded"><span className="text-gray-300">Seconds</span><div onClick={() => setShowTimePicker(true)} className="text-teal-400 font-bold cursor-pointer">{time}s <ChevronDown size={16}/></div></div>}
                                <div className="flex justify-between pt-2 text-yellow-400 font-bold text-xl"><span>Total Cost:</span><span>{formatNumber(calculateCost())} <Coins className="inline w-5 h-5"/></span></div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 text-white py-3 rounded font-bold">{isSubmitting ? '...' : 'CREATE'}</button>
                            </div>
                        )}
                    </form>
                </div>
                <div className="space-y-1 bg-gray-200 p-1 rounded-lg min-h-[200px]">
                    {userCampaigns.map(c => (
                        <div key={c.id} className="bg-white p-2 flex gap-3 border-b border-gray-300">
                            <div className="w-28 h-20 bg-black"><img src={`https://img.youtube.com/vi/${getYouTubeID(c.link)}/mqdefault.jpg`} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} alt=""/></div>
                            <div className="flex-1"><h4 className="text-xs font-bold line-clamp-2">{c.link}</h4><p className="text-[10px] text-gray-500">{c.initialCount - c.remaining}/{c.initialCount} views</p></div>
                        </div>
                    ))}
                </div>
                <SelectionModal isOpen={showViewPicker} onClose={() => setShowViewPicker(false)} title="Count" options={[10,20,50,100,500]} onSelect={setCount} />
                <SelectionModal isOpen={showTimePicker} onClose={() => setShowTimePicker(false)} title="Seconds" options={[60,90,120,180,300]} onSelect={setTime} />
            </main>
        </div>
    );
};

const YouTubePlayer = ({ videoId, onStateChange }) => {
    const playerRef = useRef(null);
    useEffect(() => {
        if (!window.YT) { const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(tag); }
        window.onYouTubeIframeAPIReady = () => {
            playerRef.current = new window.YT.Player(`Youtubeer-${videoId}`, {
                videoId, playerVars: { 'autoplay': 1, 'controls': 1 },
                events: { 'onStateChange': (e) => onStateChange(e.data === window.YT.PlayerState.PLAYING) }
            });
        };
        return () => { try { playerRef.current.destroy(); } catch(e){} };
    }, [videoId, onStateChange]);
    return <div id={`Youtubeer-${videoId}`} className="w-full h-full bg-black" />;
};

const EarnPage = ({ db, userId, type, setPage, showNotification, globalConfig, googleAccessToken }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [current, setCurrent] = useState(null);
    const [timer, setTimer] = useState(-1);
    const [claimed, setClaimed] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [watchedIds, setWatchedIds] = useState(new Set());

    useEffect(() => {
        const fetchWatched = async () => {
             const snap = await getDocs(collection(db, 'artifacts', appId, 'users', userId, 'watched'));
             setWatchedIds(new Set(snap.docs.map(d => d.id)));
        };
        fetchWatched();
    }, [userId]);

    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('type', '==', type), limit(50));
        return onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.userId !== userId && c.remaining > 0 && c.isActive !== false && !watchedIds.has(c.id));
            setCampaigns(list);
            if (!current && list.length > 0) setCurrent(list[Math.floor(Math.random() * list.length)]);
        });
    }, [db, userId, type, watchedIds]);

    useEffect(() => { if (current) { setTimer(current.requiredDuration || 30); setClaimed(false); setIsVideoPlaying(false); } }, [current]);

    useEffect(() => {
        let interval = null;
        if (!claimed && timer > 0 && ((type === 'view' || type === 'sub') ? isVideoPlaying : true)) {
            interval = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
        }
        return () => clearInterval(interval);
    }, [timer, claimed, current, type, isVideoPlaying]);

    const handleClaim = async () => {
        if (claimed || !current || timer !== 0) return;
        setClaimed(true);
        try {
            await runTransaction(db, async (tx) => {
                const campRef = doc(getCampaignsCollectionRef(), current.id);
                const campDoc = await tx.get(campRef);
                if (!campDoc.exists() || campDoc.data().remaining <= 0) throw new Error("Finished");
                tx.update(getProfileDocRef(userId), { points: increment(current.requiredDuration || 50), totalEarned: increment(current.requiredDuration || 50), tasksCompleted: increment(1) });
                tx.update(campRef, { remaining: increment(-1) });
                tx.set(doc(collection(db, 'artifacts', appId, 'users', userId, 'history')), { title: 'Task Reward', amount: current.requiredDuration || 50, date: serverTimestamp(), type: 'earn' });
                tx.set(doc(collection(db, 'artifacts', appId, 'users', userId, 'watched'), current.id), { date: serverTimestamp() });
            });
            setWatchedIds(prev => new Set(prev).add(current.id));
            showNotification('Success!', 'success');
            setTimeout(() => handleNext(), 1000);
        } catch (e) { showNotification(e.message, 'error'); }
    };

    const handleNext = () => {
        setTimer(-1); setClaimed(false);
        const available = campaigns.filter(c => c.id !== current?.id && !watchedIds.has(c.id));
        setCurrent(available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null);
    };

    const handleSubscribeClick = async () => {
        if(!current || timer > 0) return showNotification(`Wait ${timer}s`, 'error');
        if (!googleAccessToken) return showNotification('Login with Google required', 'error');
        try {
            const videoId = getYouTubeID(current.link);
            const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&access_token=${googleAccessToken}`);
            const vData = await vRes.json();
            if (!vData.items?.length) throw new Error("Video not found");
            const subRes = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&access_token=${googleAccessToken}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snippet: { resourceId: { kind: 'youtube#channel', channelId: vData.items[0].snippet.channelId } } })
            });
            if (subRes.ok || (await subRes.json()).error?.errors?.[0]?.reason === 'subscriptionDuplicate') { showNotification('Subscribed!', 'success'); handleClaim(); }
        } catch (e) { showNotification(e.message, 'error'); }
    };

    return (
        <div className="h-screen bg-[#0f172a] flex flex-col relative">
            <Header title="EARN" onBack={() => setPage('DASHBOARD')} />
            <div className="flex-1 relative bg-black">
                {current ? ((type === 'view' || type === 'sub') ? <YouTubePlayer videoId={getYouTubeID(current.link)} onStateChange={setIsVideoPlaying} /> : <iframe src={current.link} className="w-full h-full" />) : <div className="text-white center p-10">Loading...</div>}
            </div>
            <div className="bg-white p-3 pb-24">
                {current ? (
                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-yellow-600 flex items-center"><Coins className="w-5 h-5 mr-1" /> {current.requiredDuration}</span>
                            <span className={`font-bold text-sm ${timer > 0 ? 'text-red-600' : 'text-green-600'}`}>{timer > 0 ? `${timer}s` : 'Ready'}</span>
                        </div>
                        <div className="flex space-x-2">
                            {type === 'sub' ? <button onClick={handleSubscribeClick} className="flex-1 bg-red-600 text-white py-3 rounded font-bold" disabled={timer > 0 || claimed}>{claimed ? 'CLAIMED' : 'SUBSCRIBE'}</button> : <button onClick={handleClaim} disabled={timer > 0 || claimed} className={`flex-1 py-3 rounded font-bold text-white ${claimed ? 'bg-green-500' : 'bg-blue-600'}`}>{claimed ? 'SUCCESS' : 'CLAIM REWARD'}</button>}
                            <button onClick={handleNext} className="px-4 bg-yellow-500 text-white font-bold rounded">SKIP</button>
                        </div>
                    </div>
                ) : <div className="text-center p-4">No campaigns</div>}
            </div>
        </div>
    );
};

const BalanceDetailsPage = ({ db, userId, setPage, userProfile, globalConfig }) => {
    const [history, setHistory] = useState([]);
    const [showExchange, setShowExchange] = useState(false);
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawDetails, setWithdrawDetails] = useState({ bank: 'ABA', name: '', num: '', amount: '' });

    useEffect(() => {
        const q = query(getHistoryCollectionRef(userId), orderBy('date', 'desc'), limit(30));
        return onSnapshot(q, (snap) => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [userId]);

    const handleExchange = async () => {
        const coins = parseInt(exchangeAmount);
        if (!coins || coins > userProfile.points) return alert("Invalid Coins");
        const money = coins / (globalConfig.exchangeRate || 10000);
        if(!window.confirm(`Exchange ${coins} Coins = $${money.toFixed(4)}?`)) return;
        try {
            await runTransaction(db, async (tx) => {
                const userRef = getProfileDocRef(userId);
                const userDoc = await tx.get(userRef);
                if (userDoc.data().points < coins) throw new Error("Low Points");
                tx.update(userRef, { points: increment(-coins), balance: increment(money) });
                tx.set(doc(collection(db, 'artifacts', appId, 'users', userId, 'history')), { title: 'Exchanged Coins', amount: -coins, moneyEarned: money, date: serverTimestamp(), type: 'exchange' });
            });
            alert("Success!"); setExchangeAmount(''); setShowExchange(false);
        } catch (e) { alert("Failed"); }
    };

    const handleWithdraw = async () => {
        if(!globalConfig.enableWithdraw) return alert("Disabled");
        if(userProfile.tasksCompleted < (globalConfig.minTasksForWithdraw || 50)) return alert("Tasks not completed");
        const amt = parseFloat(withdrawDetails.amount);
        if(!amt || amt > userProfile.balance) return alert("Invalid Amount");
        if(!window.confirm(`Withdraw $${amt}?`)) return;
        try {
             await runTransaction(db, async (tx) => {
                const userRef = getProfileDocRef(userId);
                const userDoc = await tx.get(userRef);
                if (userDoc.data().balance < amt) throw new Error("Low Balance");
                tx.update(userRef, { balance: increment(-amt) });
                tx.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals')), { userId, userName: userProfile.userName, bankName: withdrawDetails.bank, accountName: withdrawDetails.name, accountNumber: withdrawDetails.num, amount: amt, status: 'pending', date: serverTimestamp() });
                tx.set(doc(collection(db, 'artifacts', appId, 'users', userId, 'history')), { title: 'Request Withdraw', amount: 0, moneyEarned: -amt, date: serverTimestamp(), type: 'withdraw' });
            });
            alert("Requested!"); setShowWithdraw(false);
        } catch(e) { alert(e.message); }
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="MY BALANCE" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-purple-800 p-4 text-center"><p className="text-xs">Coins</p><span className="text-2xl font-bold text-yellow-400">{formatNumber(userProfile?.points)}</span></Card>
                    <Card className="bg-green-800 p-4 text-center"><p className="text-xs">Balance</p><span className="text-2xl font-bold text-white">${(userProfile?.balance || 0).toFixed(4)}</span></Card>
                </div>
                <Card className="p-4">
                    <button onClick={() => setShowExchange(!showExchange)} className="w-full bg-yellow-600 py-2 rounded mb-2">Exchange Coins</button>
                    {showExchange && <div className="flex gap-2"><input type="number" value={exchangeAmount} onChange={e=>setExchangeAmount(e.target.value)} className="flex-1 p-2 text-black" placeholder="Coins"/><button onClick={handleExchange} className="bg-green-600 px-4">OK</button></div>}
                    <button onClick={() => setShowWithdraw(!showWithdraw)} className="w-full bg-green-600 py-2 rounded mt-2">Withdraw</button>
                    {showWithdraw && (
                        <div className="space-y-2 mt-2 bg-purple-900 p-2 rounded">
                            <input value={withdrawDetails.name} onChange={e=>setWithdrawDetails({...withdrawDetails, name: e.target.value})} placeholder="Acc Name" className="w-full p-2 text-black"/>
                            <input value={withdrawDetails.num} onChange={e=>setWithdrawDetails({...withdrawDetails, num: e.target.value})} placeholder="Acc Number" className="w-full p-2 text-black"/>
                            <div className="flex gap-2">{globalConfig.withdrawalOptions?.map(opt => <button key={opt} onClick={()=>setWithdrawDetails({...withdrawDetails, amount: opt})} className="bg-gray-700 p-2 rounded">${opt}</button>)}</div>
                            <button onClick={handleWithdraw} className="w-full bg-blue-600 py-2 rounded">SUBMIT</button>
                        </div>
                    )}
                </Card>
                <Card className="p-4 h-64 overflow-y-auto">
                    <h3 className="font-bold border-b pb-2 mb-2">History</h3>
                    {history.map(h => (
                        <div key={h.id} className="flex justify-between border-b border-purple-700 py-2">
                            <div><p className="font-bold text-sm">{h.title}</p><p className="text-[10px] opacity-70">{h.date?.toDate().toLocaleDateString()}</p></div>
                            <div className="text-right"><p className={h.amount>0?'text-green-400':'text-red-400'}>{h.amount!==0 && formatNumber(h.amount)}</p><p className={h.moneyEarned>0?'text-green-400':'text-red-400'}>{h.moneyEarned && `$${h.moneyEarned}`}</p></div>
                        </div>
                    ))}
                </Card>
            </main>
        </div>
    );
};

// --- BuyCoinsPage (SAFE VERSION - MANUAL CHECK ONLY) ---
const BuyCoinsPage = ({ db, userId, setPage, showNotification, globalConfig, userProfile }) => {
    if (!userId) return <div className="p-10 text-white text-center">Please Login.</div>;
    const [selectedPkg, setSelectedPkg] = useState(null);
    const [trxId, setTrxId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const BAKONG_ID = "monsela@aclb"; 
    const MERCHANT_NAME = "KH Market"; 

    const handleSubmitPayment = async () => {
        const cleanTrxId = trxId.trim();
        if(!cleanTrxId) return showNotification('Enter Trx ID', 'error');
        setIsSubmitting(true);
        try {
             const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'deposits'), where('transactionId', '==', cleanTrxId));
             if(!(await getDocs(q)).empty) throw new Error("Duplicate Transaction ID");
             await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'deposits')), { 
                 userId, userName: userProfile?.userName || 'Unknown', coins: selectedPkg.coins, price: selectedPkg.price, transactionId: cleanTrxId, status: 'pending', date: serverTimestamp(), method: 'KHQR_MANUAL'
             });
             showNotification('Submitted! Wait for approval.', 'success'); setSelectedPkg(null); setTrxId('');
        } catch (e) { showNotification(e.message, 'error'); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20 relative">
            <Header title="BUY COINS" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                {globalConfig.coinPackages?.map((pkg) => (
                    <button key={pkg.id} onClick={() => setSelectedPkg(pkg)} className={`w-full flex justify-between p-4 rounded-xl shadow-lg text-white ${pkg.color}`}>
                        <div className="text-left"><p className="text-xl font-bold">{formatNumber(pkg.coins)} Coins</p><p className="text-sm opacity-80">Price: {pkg.price}</p></div><div className="bg-white text-gray-800 font-bold px-4 py-2 rounded-lg">Buy</div>
                    </button>
                ))}
            </main>
            {selectedPkg && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-sm p-5 text-center relative">
                        <button onClick={() => setSelectedPkg(null)} className="absolute top-3 right-3 text-gray-500"><XCircle size={24}/></button>
                        <h3 className="text-xl font-bold text-purple-900">Scan KHQR</h3>
                        <p className="text-red-600 font-bold mb-4">{selectedPkg.price}</p>
                        <div className="bg-purple-100 p-4 rounded-xl mb-4 inline-block">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateKhqr(BAKONG_ID, parseFloat(selectedPkg.price.replace('$','')), MERCHANT_NAME))}`} alt="KHQR" className="w-48 h-48 mix-blend-multiply"/>
                            <div className="mt-2 font-bold text-purple-800">{MERCHANT_NAME}</div>
                        </div>
                        <input value={trxId} onChange={e => setTrxId(e.target.value)} placeholder="Paste Hash/Trx ID..." className="w-full p-3 border rounded mb-2 text-black font-bold"/>
                        <button onClick={handleSubmitPayment} disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded">{isSubmitting ? '...' : 'SUBMIT'}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const WatchAdsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const [adsWatched, setAdsWatched] = useState(0);
    const [timer, setTimer] = useState(15);
    const [isAdOpened, setIsAdOpened] = useState(false); 
    const [finished, setFinished] = useState(false);
    useEffect(() => { return onSnapshot(getDailyStatusDocRef(userId), (doc) => { if(doc.exists()) setAdsWatched(doc.data().adsWatchedCount || 0); }); }, [userId]);
    useEffect(() => { let i; if (isAdOpened && timer > 0) i = setInterval(() => setTimer(t => t - 1), 1000); else if (timer === 0) setFinished(true); return () => clearInterval(i); }, [timer, isAdOpened]);
    const claimReward = async () => {
        if (adsWatched >= (globalConfig.maxDailyAds || 15)) return showNotification('Limit Reached', 'error');
        await runTransaction(db, async (tx) => {
            tx.update(getProfileDocRef(userId), { points: increment(globalConfig.adsReward || 30), totalEarned: increment(globalConfig.adsReward || 30) });
            tx.set(getDailyStatusDocRef(userId), { adsWatchedCount: increment(1), date: getTodayDateKey() }, { merge: true });
            tx.set(doc(collection(db, 'artifacts', appId, 'users', userId, 'history')), { title: 'Watched Ad', amount: globalConfig.adsReward || 30, date: serverTimestamp(), type: 'ads' });
        });
        showNotification('Success!', 'success'); setPage('DASHBOARD');
    };
    if (isAdOpened) return <div className="fixed inset-0 bg-black z-50 flex flex-col"><div className="h-14 bg-purple-900 flex justify-between items-center px-4 text-white"><span className="font-bold">AD</span><div className="flex gap-2">{finished ? <button onClick={claimReward} className="bg-green-500 px-4 py-1 rounded font-bold">CLAIM</button> : <span>{timer}s</span>}<button onClick={()=>setIsAdOpened(false)}><XCircle/></button></div></div><iframe src={globalConfig.adsSettings?.directLinkUrl || "https://google.com"} className="flex-1 w-full border-0" /></div>;
    return <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4"><MonitorPlay className="w-20 h-20 text-yellow-500 mb-4" /><button onClick={()=>setIsAdOpened(true)} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full">OPEN AD</button><button onClick={() => setPage('DASHBOARD')} className="mt-8 text-gray-500 underline">Back</button></div>;
};

const MyPlanPage = ({ setPage }) => (<div className="min-h-screen bg-purple-900 pb-16 pt-20"><Header title="MY PLAN" onBack={() => setPage('DASHBOARD')} /><main className="p-4"><Card className="p-6 text-center"><CheckSquare className="w-10 h-10 text-teal-400 mx-auto mb-4" /><h2 className="text-2xl font-bold text-white">FREE PLAN</h2></Card></main></div>);

const AuthForm = ({ onSubmit, onGoogleLogin }) => {
    const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
    return <div className="space-y-4"><button onClick={onGoogleLogin} className="w-full bg-white text-gray-800 p-3 rounded font-bold border">Login with Google</button><p className="text-center text-gray-400">OR</p><form onSubmit={e => {e.preventDefault(); onSubmit(email, pass);}} className="space-y-3"><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded" /><input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-3 border rounded" /><button type="submit" className="w-full bg-purple-600 text-white p-3 rounded font-bold">Login</button></form></div>;
};

// --- 7. MAIN APP COMPONENT ---
const App = () => {
    const [page, setPage] = useState('DASHBOARD');
    const [userId, setUserId] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [notification, setNotification] = useState(null);
    const [globalConfig, setGlobalConfig] = useState(defaultGlobalConfig);
    const [googleAccessToken, setGoogleAccessToken] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    const ADMIN_UIDS = ["48wx8GPZbVYSxmfws1MxbuEOzsE3"]; 
    const isAdmin = userId && ADMIN_UIDS.includes(userId);
    const showNotification = useCallback((msg, type = 'info') => { setNotification({ message: msg, type }); setTimeout(() => setNotification(null), 3000); }, []);

    useEffect(() => { return onAuthStateChanged(auth, (user) => { if (user) { setUserId(user.uid); setShowLoginModal(false); setTimeout(() => setShowWelcomeModal(true), 1000); } else { setUserId(null); setUserProfile(null); } setIsAuthReady(true); }); }, []);
    useEffect(() => { if (userId) return onSnapshot(getProfileDocRef(userId), (doc) => { if (doc.exists()) setUserProfile({ ...doc.data(), id: userId }); }); }, [userId]);
    useEffect(() => { return onSnapshot(getGlobalConfigDocRef(), (doc) => { if (doc.exists()) setGlobalConfig({ ...defaultGlobalConfig, ...doc.data() }); }); }, []);

    const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { showNotification(e.code, 'error'); } };
    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider(); provider.addScope('https://www.googleapis.com/auth/youtube.force-ssl');
            const result = await signInWithPopup(auth, provider); 
            setGoogleAccessToken(GoogleAuthProvider.credentialFromResult(result).accessToken);
            const uid = result.user.uid;
            if (!(await getDoc(getProfileDocRef(uid))).exists()) {
                 const shortId = getShortId(uid);
                 await setDoc(getProfileDocRef(uid), { userId: uid, email: result.user.email, userName: result.user.displayName, points: globalConfig.signupBonus, totalEarned: globalConfig.signupBonus, shortId, createdAt: serverTimestamp(), balance: 0 });
                 await setDoc(getShortCodeDocRef(shortId), { fullUserId: uid, shortId });
            }
        } catch (e) { showNotification(e.message, 'error'); }
    };

    const handleDailyCheckin = async () => {
        try {
            await runTransaction(db, async (tx) => {
                if ((await tx.get(getDailyStatusDocRef(userId))).exists()) throw new Error("Checked In");
                tx.update(getProfileDocRef(userId), { points: increment(globalConfig.dailyCheckinReward) });
                tx.set(getDailyStatusDocRef(userId), { checkinDone: true, date: getTodayDateKey() });
                tx.set(doc(collection(db, 'artifacts', appId, 'users', userId, 'history')), { title: 'Daily Check-in', amount: globalConfig.dailyCheckinReward, date: serverTimestamp(), type: 'checkin' });
            });
            showNotification('Checked In!', 'success');
        } catch (e) { showNotification('Already Checked In', 'info'); }
    };

    if (!isAuthReady) return <Loading />;

    let Content;
    switch (page) {
        case 'EARN_POINTS': Content = <EarnPage db={db} userId={userId} type="view" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_WEBSITE': Content = <EarnPage db={db} userId={userId} type="website" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_SUBSCRIPTION': Content = <EarnPage db={db} userId={userId} type="sub" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} googleAccessToken={googleAccessToken} />; break;
        case 'MY_CAMPAIGNS': Content = <MyCampaignsPage db={db} userId={userId} userProfile={userProfile} setPage={setPage} showNotification={showNotification} />; break;
        case 'REFERRAL_PAGE': Content = <ReferralPage db={db} userId={userId} userProfile={userProfile} showNotification={showNotification} setPage={setPage} globalConfig={globalConfig} />; break;
        case 'BUY_COINS': Content = <BuyCoinsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} userProfile={userProfile} />; break;
        case 'BALANCE_DETAILS': Content = <BalanceDetailsPage db={db} userId={userId} setPage={setPage} userProfile={userProfile} globalConfig={globalConfig} />; break;
        case 'WATCH_ADS': Content = <WatchAdsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_PLAN': Content = <MyPlanPage setPage={setPage} />; break;
        case 'ADMIN_DASHBOARD': Content = <AdminDashboardPage db={db} setPage={setPage} showNotification={showNotification} />; break;
        default:
            Content = (
                <div className="min-h-screen bg-purple-900 pb-16 pt-20">
                    <Header title="MSL Booster" rightContent={isAdmin ? <button onClick={() => setPage('ADMIN_DASHBOARD')}><Settings/></button> : userId ? <button onClick={()=>signOut(auth)}><LogOut/></button> : <button onClick={()=>setShowLoginModal(true)} className="bg-teal-600 px-3 py-1 rounded text-xs">LOGIN</button>} />
                    <div className="px-4 mb-6 text-center text-white">
                        <h1 className="text-5xl font-extrabold text-yellow-400 flex justify-center items-center gap-2">{formatNumber(userProfile?.points || 0)} <Coins className="w-8 h-8"/></h1>
                        <p className="text-xl font-bold mt-2">${(userProfile?.balance || 0).toFixed(4)}</p>
                        <p className="text-xs bg-black/20 inline-block px-2 rounded mt-2">ID: {userProfile?.shortId || 'GUEST'}</p>
                    </div>
                    <div className="px-4"><Card className="p-4 grid grid-cols-3 gap-3">
                        <IconButton icon={CalendarCheck} title="DAILY TASK" onClick={() => userId ? handleDailyCheckin() : setShowLoginModal(true)} iconColor={userProfile?.dailyCheckin ? 'text-gray-500' : 'text-blue-400'} disabled={!!userProfile?.dailyCheckin} />
                        <IconButton icon={UserCheck} title="SUBSCRIBE" onClick={() => userId ? setPage('EXPLORE_SUBSCRIPTION') : setShowLoginModal(true)} iconColor="text-pink-400" />
                        <IconButton icon={Film} title="PLAY VIDEO" onClick={() => userId ? setPage('EARN_POINTS') : setShowLoginModal(true)} iconColor="text-red-400" />
                        <IconButton icon={Wallet} title="MY BALANCE" onClick={() => userId ? setPage('BALANCE_DETAILS') : setShowLoginModal(true)} iconColor="text-orange-400" />
                        <IconButton icon={ShoppingCart} title="BUY COINS" onClick={() => userId ? (globalConfig.enableBuyCoins ? setPage('BUY_COINS') : showNotification('Coming Soon', 'info')) : setShowLoginModal(true)} iconColor="text-purple-400" />
                        <IconButton icon={Target} title="CAMPAIGNS" onClick={() => userId ? setPage('MY_CAMPAIGNS') : setShowLoginModal(true)} iconColor="text-teal-400" />
                        <IconButton icon={UserPlus} title="REFERRAL" onClick={() => userId ? setPage('REFERRAL_PAGE') : setShowLoginModal(true)} iconColor="text-blue-400" />
                        <IconButton icon={Globe} title="WEBSITE" onClick={() => userId ? setPage('EXPLORE_WEBSITE') : setShowLoginModal(true)} iconColor="text-indigo-400" />
                        <IconButton icon={MonitorPlay} title="WATCH ADS" onClick={() => userId ? setPage('WATCH_ADS') : setShowLoginModal(true)} iconColor="text-pink-400" />
                    </Card></div>
                    <div className="px-4 mt-6"><div className="w-full bg-white h-20 rounded-lg overflow-hidden">{globalConfig.adsSettings?.bannerImgUrl ? <img src={globalConfig.adsSettings.bannerImgUrl} className="w-full h-full object-cover"/> : <div className="text-center pt-6 text-gray-400">ADS SPACE</div>}</div></div>
                </div>
            );
    }

    return (
        <div className="font-sans bg-purple-900 min-h-screen relative">
            {Content}
            {notification && <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-50 text-white font-bold ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{notification.message}</div>}
            {showLoginModal && <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-sm p-6 relative"><button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4"><XCircle/></button><AuthForm onSubmit={handleLogin} onGoogleLogin={handleGoogleLogin} /></div></div>}
            {showWelcomeModal && userId && globalConfig.welcomePopup?.isEnabled && <WelcomeModal isOpen={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} title={globalConfig.welcomePopup.title} message={globalConfig.welcomePopup.message} />}
        </div>
    );
};

export default App;
