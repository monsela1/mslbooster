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
    runTransaction, increment, limit, orderBy
} from 'firebase/firestore';
import {
    Users, Coins, Video, Link, Globe, MonitorPlay, Zap,
    UserPlus, ChevronLeft, BookOpen, ShoppingCart,
    CalendarCheck, Target, Wallet, Film, UserCheck,
    DollarSign, LogOut, Mail, Lock, CheckSquare, Edit, Trash2,
    Settings, Copy, Save, Search, PlusCircle, MinusCircle,
    CheckCircle, XCircle, RefreshCw, User, ExternalLink, TrendingUp,
    ArrowUpRight, ArrowDownLeft, Clock, ChevronDown, 
    Banknote, ThumbsUp, ThumbsDown, ArrowRightLeft, History
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

// --- 3. HELPER FUNCTIONS ---
const getTodayDateKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getShortId = (id) => id?.substring(0, 6).toUpperCase() || '------';
const formatNumber = (num) => num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';
const formatCurrency = (num) => '$' + (num || 0).toFixed(4); // Show 4 decimals for small amounts

const getYouTubeID = (url) => {
    if (!url) return null;
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

// Firestore Paths
const getProfileDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'profile', 'user_data') : null;
const getCampaignsCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'campaigns') : null;
const getReferralCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'referrals') : null;
const getDailyStatusDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'daily_status', getTodayDateKey()) : null;
const getGlobalConfigDocRef = () => db ? doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings') : null;
const getShortCodeDocRef = (shortId) => db && shortId ? doc(db, 'artifacts', appId, 'public', 'data', 'short_codes', shortId) : null;
const getHistoryCollectionRef = (userId) => db && userId ? collection(db, 'artifacts', appId, 'users', userId, 'history') : null;
const getWithdrawalRequestsCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'withdrawal_requests') : null;

// Default Config
const defaultGlobalConfig = {
    dailyCheckinReward: 200,
    referrerReward: 1000,
    referredBonus: 500,
    adsReward: 30,
    maxDailyAds: 15,
    enableBuyCoins: true, 
    commissionRate: 0.10, // 10%
    minWithdrawal: 1.00, // $1
    pointsPerDollar: 5000, // 5000 Points = $1 (New Exchange Rate Setting)
    adsSettings: {
        bannerId: "ca-app-pub-xxxxxxxx/yyyyyy",
        interstitialId: "ca-app-pub-xxxxxxxx/zzzzzz",
        isEnabled: true
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

// --- 5. ADMIN PAGES ---

const AdminSettingsTab = ({ config, setConfig, onSave }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Allow float for rates, int for others
        const val = (name === 'commissionRate' || name === 'minWithdrawal') 
            ? parseFloat(value) 
            : parseInt(value) || 0;
        setConfig(prev => ({ ...prev, [name]: val }));
    };

    const handleToggleChange = () => {
        setConfig(prev => ({ ...prev, enableBuyCoins: !prev.enableBuyCoins }));
    };

    const handleAdsChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            adsSettings: { ...prev.adsSettings, [name]: value }
        }));
    };

    const handlePackageChange = (index, field, value) => {
        const newPackages = config.coinPackages ? [...config.coinPackages] : [];
        if (newPackages[index]) {
            newPackages[index][field] = field === 'coins' ? (parseInt(value) || 0) : value;
            setConfig(prev => ({ ...prev, coinPackages: newPackages }));
        }
    };

    return (
        <div className="space-y-4 pb-10">
            <Card className="p-4 border-l-4 border-blue-500">
                <h3 className="font-bold text-lg mb-3 text-blue-400 flex items-center"><Settings className="w-5 h-5 mr-2"/> ការកំណត់ទូទៅ (Features)</h3>
                <div className="flex items-center justify-between bg-purple-900/50 p-4 rounded-lg border border-purple-600">
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-base">បើកមុខងារទិញកាក់ (Enable Buy Coins)</span>
                        <span className={`text-xs mt-1 font-bold ${config.enableBuyCoins ? 'text-green-400' : 'text-red-400'}`}>
                            ស្ថានភាព: {config.enableBuyCoins ? 'កំពុងបើក (ON)' : 'កំពុងបិទ (OFF)'}
                        </span>
                    </div>
                    <button 
                        onClick={handleToggleChange}
                        className={`relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${
                            config.enableBuyCoins ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                    >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                            config.enableBuyCoins ? 'translate-x-8' : 'translate-x-0'
                        }`}></div>
                    </button>
                </div>
            </Card>

            <Card className="p-4 border-l-4 border-yellow-400">
                <h3 className="font-bold text-lg mb-3 text-yellow-400 flex items-center"><Coins className="w-5 h-5 mr-2"/> ការកំណត់រង្វាន់ & លុយ</h3>
                <div className="grid grid-cols-1 gap-3">
                    <div><label className="text-xs font-bold text-purple-300">Daily Check-in Points</label><InputField name="dailyCheckinReward" type="number" min="0" value={config.dailyCheckinReward || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Referral Reward Points</label><InputField name="referrerReward" type="number" min="0" value={config.referrerReward || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Referred User Bonus</label><InputField name="referredBonus" type="number" min="0" value={config.referredBonus || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Watch Ads Reward</label><InputField name="adsReward" type="number" min="0" value={config.adsReward || 0} onChange={handleChange} /></div>
                    <div className="pt-3 border-t border-purple-600 mt-2">
                        <label className="text-xs font-bold text-yellow-300">ចំនួនមើលពាណិជ្ជកម្មក្នុងមួយថ្ងៃ (Max Daily Ads)</label>
                        <InputField name="maxDailyAds" type="number" min="1" value={config.maxDailyAds || 15} onChange={handleChange} />
                    </div>
                    <div className="pt-3 border-t border-purple-600 mt-2">
                        <label className="text-xs font-bold text-green-300">Commission Rate (e.g., 0.1 for 10%)</label>
                        <InputField name="commissionRate" type="number" step="0.01" value={config.commissionRate || 0} onChange={handleChange} />
                    </div>
                    {/* NEW EXCHANGE RATE SETTING */}
                    <div className="pt-3 border-t border-purple-600 mt-2">
                        <label className="text-xs font-bold text-green-300">ចំនួនកាក់ស្មើ 1$ (Points per 1 USD)</label>
                        <InputField name="pointsPerDollar" type="number" step="1" value={config.pointsPerDollar || 5000} onChange={handleChange} />
                    </div>
                     <div className="pt-3 border-t border-purple-600 mt-2">
                        <label className="text-xs font-bold text-green-300">Minimum Withdrawal Amount ($)</label>
                        <InputField name="minWithdrawal" type="number" step="1" value={config.minWithdrawal || 0} onChange={handleChange} />
                    </div>
                </div>
            </Card>

            <Card className="p-4 border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-3 text-green-400 flex items-center"><ShoppingCart className="w-5 h-5 mr-2"/> កំណត់កញ្ចប់កាក់ (Sell Coins)</h3>
                <div className="space-y-3">
                    {config.coinPackages?.map((pkg, idx) => (
                        <div key={pkg.id || idx} className="flex space-x-2 items-center bg-purple-900 p-2 rounded">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">{idx + 1}</div>
                            <div className="flex-1">
                                <label className="text-xs text-purple-300">ចំនួនកាក់</label>
                                <InputField type="number" min="0" value={pkg.coins} onChange={(e) => handlePackageChange(idx, 'coins', e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-purple-300">តម្លៃលក់ ($)</label>
                                <InputField type="text" value={pkg.price} onChange={(e) => handlePackageChange(idx, 'price', e.target.value)} />
                            </div>
                        </div>
                    )) || <p className="text-red-300 text-sm">No packages found.</p>}
                </div>
            </Card>

            <Card className="p-4 border-l-4 border-pink-500">
                <h3 className="font-bold text-lg mb-3 text-pink-400 flex items-center"><MonitorPlay className="w-5 h-5 mr-2"/> ការកំណត់ Ads IDs</h3>
                <div className="space-y-3">
                    <div><label className="text-xs font-bold text-purple-300">Banner ID</label><InputField name="bannerId" type="text" value={config.adsSettings?.bannerId || ''} onChange={handleAdsChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Interstitial/Video ID</label><InputField name="interstitialId" type="text" value={config.adsSettings?.interstitialId || ''} onChange={handleAdsChange} /></div>
                </div>
            </Card>

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
    const [allUsers, setAllUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(false);

    const loadUserList = async () => {
        setLoadingList(true);
        try {
            const shortCodesRef = collection(db, 'artifacts', appId, 'public', 'data', 'short_codes');
            const q = query(shortCodesRef, limit(20));
            const snap = await getDocs(q);
            
            const usersData = await Promise.all(snap.docs.map(async (docSnap) => {
                const { fullUserId } = docSnap.data();
                if(!fullUserId) return null;
                const profileSnap = await getDoc(getProfileDocRef(fullUserId));
                if (profileSnap.exists()) {
                    return { ...profileSnap.data(), uid: fullUserId };
                }
                return null;
            }));
            
            setAllUsers(usersData.filter(u => u !== null));
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
                if(profile.exists()){
                    setFoundUser({ uid, ...profile.data() });
                }
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
            showNotification('Points updated successfully', 'success');
            setFoundUser(prev => ({...prev, points: prev.points + parseInt(pointsToAdd)}));
            setPointsToAdd(0);
            loadUserList();
        } catch(e) { showNotification('Update failed', 'error'); }
    };

    const handleDeleteUser = async (targetUid, targetShortId) => {
        if(!window.confirm('តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ? (សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយវិញបានទេ)')) return;
        try {
            if(targetUid) await deleteDoc(getProfileDocRef(targetUid));
            if(targetShortId) await deleteDoc(getShortCodeDocRef(targetShortId));
            showNotification('បានលុបគណនីដោយជោគជ័យ!', 'success');
            setFoundUser(null);
            loadUserList(); 
        } catch (e) {
            console.error(e);
            showNotification('បរាជ័យក្នុងការលុប: ' + e.message, 'error');
        }
    };

    return (
        <div className='space-y-4 pb-10'>
            <Card className="p-4">
                <h3 className="font-bold text-lg mb-4 text-white">ស្វែងរក & កែប្រែ</h3>
                <div className="flex space-x-2 mb-4">
                    <InputField
                        value={searchId}
                        onChange={e => setSearchId(e.target.value.toUpperCase())}
                        placeholder="Enter ID (e.g. A1B2C3)"
                        className="uppercase font-mono"
                        maxLength={6}
                    />
                    <button onClick={handleSearch} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Search/></button>
                </div>
               
                {foundUser && (
                    <div className="bg-purple-900 p-4 rounded-lg border border-purple-600 relative">
                         <button 
                            onClick={() => handleDeleteUser(foundUser.uid, foundUser.shortId)}
                            className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            title="លុបគណនីនេះ"
                         >
                            <Trash2 size={20} />
                        </button>

                        <p className="font-bold text-lg text-white">{foundUser.userName}</p>
                        <p className="text-purple-300 text-sm">Email: {foundUser.email}</p>
                        <p className="text-purple-300 text-sm">Current Points: <span className="font-bold text-yellow-400">{formatNumber(foundUser.points)}</span></p>
                        <p className="text-purple-300 text-sm mb-2">Withdrawable: <span className="font-bold text-green-400">{formatCurrency(foundUser.realBalance)}</span></p>
                       
                        <div className="flex items-center space-x-2 mt-4">
                            <button onClick={() => setPointsToAdd(p => p - 100)} className="p-2 bg-red-600 rounded text-white"><MinusCircle size={20}/></button>
                            <InputField
                                type="number"
                                value={pointsToAdd}
                                onChange={e => setPointsToAdd(parseInt(e.target.value) || 0)}
                                className="text-center font-bold"
                            />
                            <button onClick={() => setPointsToAdd(p => p + 100)} className="p-2 bg-green-600 rounded text-white"><PlusCircle size={20}/></button>
                        </div>
                        <button onClick={handleUpdatePoints} className="w-full mt-3 bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700">Update Points</button>
                    </div>
                )}
            </Card>

            <Card className="p-4">
                <div className='flex justify-between items-center mb-3'>
                    <h3 className="font-bold text-lg text-white">បញ្ជីអ្នកប្រើប្រាស់ ({allUsers.length})</h3>
                    <button onClick={loadUserList} className='p-2 bg-purple-600 rounded hover:bg-purple-500'><RefreshCw size={18} className='text-white'/></button>
                </div>
               
                {loadingList ? <div className='text-center text-purple-300'>Loading users...</div> : (
                    <div className='overflow-y-auto max-h-64 space-y-2'>
                        {allUsers.map((u, i) => (
                            <div key={u.uid || i} className='flex justify-between items-center bg-purple-900 p-3 rounded border border-purple-700 cursor-pointer hover:bg-purple-800 transition'>
                                <div onClick={() => {setFoundUser(u); setSearchId(u.shortId);}} className="flex-1">
                                    <p className='font-bold text-white text-sm'>{u.userName}</p>
                                    <p className='text-xs text-purple-400 font-mono'>{u.shortId} | {u.email}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className='font-bold text-yellow-400 mr-2'>{formatNumber(u.points)}</span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                            handleDeleteUser(u.uid, u.shortId);
                                        }}
                                        className="p-2 bg-red-900/50 text-red-400 rounded hover:bg-red-600 hover:text-white transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

const AdminWithdrawalsTab = ({ db, showNotification }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(getWithdrawalRequestsCollectionRef(), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [db]);

    const handleApprove = async (id) => {
        if(!window.confirm('តើអ្នកបានផ្ទេរលុយ ($) ឱ្យ User រួចរាល់ហើយឬនៅ?')) return;
        try {
            const reqRef = doc(getWithdrawalRequestsCollectionRef(), id);
            await updateDoc(reqRef, { status: 'completed' });
            showNotification('Request Approved!', 'success');
        } catch(e) { showNotification(e.message, 'error'); }
    };

    const handleReject = async (id, userId, amount) => {
        if(!window.confirm('តើអ្នកពិតជាចង់បដិសេធ និងបង្វិលលុយចូលគណនី User វិញមែនទេ?')) return;
        try {
            await runTransaction(db, async (tx) => {
                const reqRef = doc(getWithdrawalRequestsCollectionRef(), id);
                const profileRef = getProfileDocRef(userId);

                tx.update(profileRef, { realBalance: increment(amount) }); // Refund
                tx.update(reqRef, { status: 'rejected' });
            });
            showNotification('Request Rejected (Refunded)!', 'success');
        } catch(e) { showNotification(e.message, 'error'); }
    };

    return (
        <div className="space-y-4 pb-10">
            {loading && <p className="text-center text-purple-300">Loading requests...</p>}
            {!loading && requests.length === 0 && <p className="text-center text-purple-400">No pending withdrawal requests.</p>}
            {requests.map(req => (
                <Card key={req.id} className="p-4 border-l-4 border-yellow-400">
                    <p className="font-bold text-lg text-white">Request: {formatCurrency(req.amount)}</p>
                    <p className="text-sm text-purple-300">User: {req.userName} ({req.shortId})</p>
                    <p className="text-sm text-purple-300 mb-3">To: {req.paymentInfo}</p>
                    
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => handleApprove(req.id)}
                            className="flex-1 bg-green-600 text-white p-2 rounded-lg font-bold flex items-center justify-center space-x-2 hover:bg-green-700"
                        >
                            <ThumbsUp size={18} /> <span>Approve</span>
                        </button>
                        <button 
                            onClick={() => handleReject(req.id, req.userId, req.amount)}
                            className="flex-1 bg-red-600 text-white p-2 rounded-lg font-bold flex items-center justify-center space-x-2 hover:bg-red-700"
                        >
                            <ThumbsDown size={18} /> <span>Reject</span>
                        </button>
                    </div>
                </Card>
            ))}
        </div>
    );
};

// --- NEW: Balance Page with Exchange & Withdraw ---
const BalanceDetailsPage = ({ db, userId, setPage, userProfile, globalConfig, showNotification }) => {
    const [activeTab, setActiveTab] = useState('HISTORY'); // 'HISTORY', 'EXCHANGE', 'WITHDRAW'
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Exchange States
    const [pointsToExchange, setPointsToExchange] = useState('');
    const [isExchanging, setIsExchanging] = useState(false);

    // Withdraw States
    const [amount, setAmount] = useState('');
    const [paymentInfo, setPaymentInfo] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Config
    const pointsPerDollar = globalConfig.pointsPerDollar || 5000; // Default 5000 if not set
    const minWithdrawal = globalConfig.minWithdrawal || 1;

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(getHistoryCollectionRef(userId), orderBy('date', 'desc'), limit(30));
        const unsub = onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [db, userId]);

    // --- EXCHANGE ACTION ---
    const handleExchange = async (e) => {
        e.preventDefault();
        const pts = parseInt(pointsToExchange);
        if (!pts || pts <= 0) return showNotification('Please enter valid points', 'error');
        if (pts > userProfile.points) return showNotification('Not enough points', 'error');

        setIsExchanging(true);
        try {
            const usdValue = pts / pointsPerDollar;
            
            await runTransaction(db, async (tx) => {
                const profileRef = getProfileDocRef(userId);
                // Deduct Points, Add Real Balance
                tx.update(profileRef, { 
                    points: increment(-pts),
                    realBalance: increment(usdValue)
                });

                const historyRef = doc(getHistoryCollectionRef(userId));
                tx.set(historyRef, {
                    title: `Exchanged ${formatNumber(pts)} Coins`,
                    amount: usdValue,
                    date: serverTimestamp(),
                    type: 'exchange' // Special type for exchange
                });
            });
            showNotification(`Success! Exchanged to ${formatCurrency(usdValue)}`, 'success');
            setPointsToExchange('');
        } catch(e) { showNotification(e.message, 'error'); }
        setIsExchanging(false);
    };

    // --- WITHDRAW ACTION ---
    const handleWithdraw = async (e) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0) return showNotification('Invalid amount', 'error');
        if (val < minWithdrawal) return showNotification(`Minimum is ${formatCurrency(minWithdrawal)}`, 'error');
        if (val > userProfile.realBalance) return showNotification('Insufficient balance', 'error');
        if (!paymentInfo.trim()) return showNotification('Enter Payment Info', 'error');

        setIsWithdrawing(true);
        try {
             await runTransaction(db, async (tx) => {
                const profileRef = getProfileDocRef(userId);
                
                // 1. Deduct from user's realBalance
                tx.update(profileRef, { realBalance: increment(-val) });

                // 2. Create withdrawal request for Admin
                const reqRef = collection(db, 'artifacts', appId, 'public', 'data', 'withdrawal_requests');
                tx.set(doc(reqRef), {
                    userId: userId,
                    shortId: userProfile.shortId,
                    userName: userProfile.userName,
                    amount: val,
                    paymentInfo: paymentInfo.trim(),
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                // 3. Add to user's history
                const historyRef = doc(getHistoryCollectionRef(userId));
                tx.set(historyRef, {
                    title: 'Withdrawal Request',
                    amount: -val,
                    date: serverTimestamp(),
                    type: 'withdrawal'
                });
            });
            showNotification('Request sent successfully!', 'success');
            setAmount('');
        } catch(e) { showNotification(e.message, 'error'); }
        setIsWithdrawing(false);
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="MY BALANCE" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                
                {/* Balance Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-gradient-to-br from-purple-700 to-purple-900 text-center p-4 text-white border-purple-500">
                        <p className="text-xs opacity-70 mb-1">Points Balance</p>
                        <div className="flex justify-center items-center"><Coins className="w-5 h-5 text-yellow-400 mr-1" /><span className="text-xl font-bold">{formatNumber(userProfile.points)}</span></div>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600 to-teal-800 text-center p-4 text-white border-teal-500">
                        <p className="text-xs opacity-70 mb-1">Withdrawable ($)</p>
                        <div className="flex justify-center items-center"><Banknote className="w-5 h-5 text-white mr-1" /><span className="text-xl font-bold">{formatCurrency(userProfile.realBalance)}</span></div>
                    </Card>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-purple-800 p-1 rounded-lg">
                     {['HISTORY', 'EXCHANGE', 'WITHDRAW'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${activeTab === tab ? 'bg-teal-600 text-white shadow' : 'text-purple-300 hover:bg-purple-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* --- TAB CONTENT --- */}
                
                {/* 1. HISTORY TAB */}
                {activeTab === 'HISTORY' && (
                    <Card className="p-4">
                        <h3 className="font-bold text-white mb-3 border-b border-purple-600 pb-2 flex items-center"><Clock className="w-4 h-4 mr-2"/> ប្រវត្តិ (History)</h3>
                        {loading ? <div className="text-center text-purple-300">Loading...</div> : 
                         history.length > 0 ? (
                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                                {history.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center bg-purple-800 p-3 rounded-lg border border-purple-700">
                                        <div>
                                            <p className="text-white text-sm font-bold">{item.title}</p>
                                            <p className="text-[10px] text-purple-300 opacity-70">{item.date?.toDate().toLocaleDateString()}</p>
                                        </div>
                                        <span className={`font-bold ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {/* Conditional Formatting: Money vs Points */}
                                            {['exchange', 'withdrawal', 'commission'].includes(item.type) 
                                                ? formatCurrency(item.amount) 
                                                : (item.amount > 0 ? '+' : '') + formatNumber(item.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-center text-purple-400 py-4">No history yet.</div>}
                    </Card>
                )}

                {/* 2. EXCHANGE TAB */}
                {activeTab === 'EXCHANGE' && (
                    <Card className="p-4">
                        <h3 className="font-bold text-white mb-3 flex items-center"><ArrowRightLeft className="w-5 h-5 mr-2 text-yellow-400"/> ប្តូរកាក់ជាលុយ</h3>
                        <div className="bg-purple-900/50 p-3 rounded mb-4 text-center border border-purple-600">
                             <p className="text-purple-300 text-sm">Rate: <span className="text-white font-bold">{formatNumber(pointsPerDollar)} Points = $1.00</span></p>
                        </div>
                        <form onSubmit={handleExchange} className="space-y-4">
                            <div>
                                <label className="text-xs text-purple-300">ចំនួនកាក់ចង់ប្តូរ</label>
                                <InputField 
                                    type="number" 
                                    placeholder="0" 
                                    value={pointsToExchange}
                                    onChange={e => setPointsToExchange(e.target.value)}
                                />
                            </div>
                            <div className="text-right text-sm text-green-400 font-bold">
                                នឹងទទួលបាន: {formatCurrency((parseInt(pointsToExchange) || 0) / pointsPerDollar)}
                            </div>
                            <button 
                                disabled={isExchanging}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg shadow transition"
                            >
                                {isExchanging ? 'កំពុងប្តូរ...' : 'ប្តូរឥឡូវនេះ (EXCHANGE)'}
                            </button>
                        </form>
                    </Card>
                )}

                {/* 3. WITHDRAW TAB */}
                {activeTab === 'WITHDRAW' && (
                    <Card className="p-4">
                        <h3 className="font-bold text-white mb-3 flex items-center"><Banknote className="w-5 h-5 mr-2 text-green-400"/> ស្នើសុំដកប្រាក់</h3>
                        <form onSubmit={handleWithdraw} className="space-y-4">
                             <div>
                                <label className="text-xs text-purple-300">ចំនួនទឹកប្រាក់ ($)</label>
                                <InputField 
                                    type="number" 
                                    step="0.01"
                                    placeholder={`Min: ${formatCurrency(minWithdrawal)}`}
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-purple-300">ព័ត៌មានគណនី (ABA/Wing/Tell)</label>
                                <InputField 
                                    type="text" 
                                    placeholder="Example: 000 123 456 (John Doe)"
                                    value={paymentInfo}
                                    onChange={e => setPaymentInfo(e.target.value)}
                                />
                            </div>
                             <button 
                                disabled={isWithdrawing}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow transition"
                            >
                                {isWithdrawing ? 'កំពុងស្នើសុំ...' : 'ស្នើសុំដកប្រាក់ (REQUEST)'}
                            </button>
                        </form>
                    </Card>
                )}

            </main>
        </div>
    );
};

// ... (BuyCoinsPage, WatchAdsPage, MyPlanPage, AuthForm, App components remain unchanged from previous context)
const BuyCoinsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const handlePurchase = async (pkg) => {
        try {
            await runTransaction(db, async (tx) => {
                tx.update(getProfileDocRef(userId), {
                    points: increment(pkg.coins),
                    totalEarned: increment(pkg.coins)
                });
                // SAVE HISTORY
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                tx.set(historyRef, {
                    title: 'Purchased Coins',
                    amount: pkg.coins,
                    date: serverTimestamp(),
                    type: 'buy'
                });
            });
            showNotification(`ទិញបានជោគជ័យ! +${formatNumber(pkg.coins)} coins`, 'success');
        } catch (error) { showNotification(`បរាជ័យ: ${error.message}`, 'error'); }
    };
    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="BUY COINS" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                {globalConfig.coinPackages?.map((pkg) => (
                    <button key={pkg.id} onClick={() => handlePurchase(pkg)} className={`w-full flex items-center justify-between p-4 rounded-xl shadow-lg text-white transform active:scale-95 transition ${pkg.color}`}>
                        <div className="flex items-center space-x-3">
                            <div className="bg-white bg-opacity-20 p-3 rounded-full"><Coins className="w-6 h-6 text-yellow-100" /></div>
                            <div className="text-left"><p className="text-xl font-bold">{formatNumber(pkg.coins)} Coins</p><p className="text-sm opacity-80">កញ្ចប់ពិន្ទុ</p></div>
                        </div>
                        <div className="bg-white text-gray-800 font-bold px-4 py-2 rounded-lg">{pkg.price}</div>
                    </button>
                ))}
            </main>
        </div>
    );
};

const WatchAdsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const [adsWatched, setAdsWatched] = useState(0);
    const [timer, setTimer] = useState(15);
    const [finished, setFinished] = useState(false);
    const reward = globalConfig.adsReward || 30;
    const maxDaily = globalConfig.maxDailyAds || 15;

    useEffect(() => {
        const unsub = onSnapshot(getDailyStatusDocRef(userId), (doc) => {
            if(doc.exists()) setAdsWatched(doc.data().adsWatchedCount || 0);
        });
        return () => unsub();
    }, [userId]);

    useEffect(() => {
        let interval;
        if (timer > 0) { interval = setInterval(() => setTimer(t => t - 1), 1000); }
        else setFinished(true);
        return () => clearInterval(interval);
    }, [timer]);

    const claimReward = async () => {
        if (adsWatched >= maxDaily) return showNotification('អស់សិទ្ធិមើលសម្រាប់ថ្ងៃនេះហើយ!', 'error');
        try {
            await runTransaction(db, async (tx) => {
                const dailyRef = getDailyStatusDocRef(userId);
                tx.update(getProfileDocRef(userId), {
                    points: increment(reward),
                    totalEarned: increment(reward)
                });
                tx.set(dailyRef, { adsWatchedCount: increment(1), date: getTodayDateKey() }, { merge: true });
               
                // SAVE HISTORY
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                tx.set(historyRef, {
                    title: 'Watched Ad',
                    amount: reward,
                    date: serverTimestamp(),
                    type: 'ads'
                });
            });
            showNotification(`ទទួលបាន ${reward} Coins!`, 'success');
            setPage('DASHBOARD');
        } catch (e) { showNotification(e.message, 'error'); }
    };

    const isLimitReached = adsWatched >= maxDaily;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 z-50">
            <div className="text-white text-2xl font-bold mb-4">កំពុងមើលពាណិជ្ជកម្ម...</div>
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center rounded-lg mb-6 border-2 border-yellow-500 relative">
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                    Watched: {adsWatched} / {maxDaily}
                </div>
                <div className="text-center">
                    <MonitorPlay className="w-16 h-16 text-yellow-500 mx-auto mb-2" />
                    <p className="text-white">ADS ID: {globalConfig.adsSettings?.interstitialId || 'N/A'}</p>
                </div>
            </div>
            {isLimitReached ? (
                <div className="text-red-500 font-bold text-xl bg-white p-3 rounded">អស់សិទ្ធិមើលសម្រាប់ថ្ងៃនេះហើយ</div>
            ) : (
                finished ?
                <button onClick={claimReward} className="bg-green-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg animate-bounce">ទទួលរង្វាន់ (Claim)</button>
                : <div className="text-white text-xl">រង់ចាំ: {timer} វិនាទី</div>
            )}
        </div>
    );
};

const MyPlanPage = ({ setPage }) => (
    <div className="min-h-screen bg-purple-900 pb-16 pt-20">
        <Header title="MY PLAN" onBack={() => setPage('DASHBOARD')} />
        <main className="p-4">
            <Card className="p-6 text-center">
                <div className="w-20 h-20 bg-purple-700 rounded-full flex items-center justify-center mx-auto mb-4"><CheckSquare className="w-10 h-10 text-teal-400" /></div>
                <h2 className="text-2xl font-bold text-white">FREE PLAN</h2>
                <p className="text-purple-300 mt-2">បច្ចុប្បន្នអ្នកកំពុងប្រើប្រាស់គម្រោងឥតគិតថ្លៃ។</p>
                 <div className="mt-6 space-y-3 text-left">
                    <p className="flex items-center text-purple-200"><span className="mr-2 text-green-400">✔</span> មើលវីដេអូបាន</p>
                    <p className="flex items-center text-purple-200"><span className="mr-2 text-green-400">✔</span> ដាក់យុទ្ធនាការបាន</p>
                </div>
            </Card>
        </main>
    </div>
);

// --- 7. AUTH COMPONENT (Google + Email Login Only) ---
const AuthForm = ({ onSubmit, btnText, isRegister = false, onGoogleLogin }) => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(email, pass, null, null);
    };

    return (
        <div className="space-y-4">
             {/* GOOGLE BUTTON FIRST (Primary Action) */}
            <button 
                onClick={onGoogleLogin} 
                className="w-full bg-white text-gray-800 p-3 rounded font-bold hover:bg-gray-100 transition shadow-lg flex items-center justify-center border border-gray-300"
            >
                {/* Google SVG Icon */}
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                បន្តជាមួយប្រើ Google
            </button>

            <div className="flex items-center justify-center space-x-2 my-4">
                <div className="h-px bg-purple-600 flex-1"></div>
                <span className="text-purple-300 text-xs font-bold">ឬ ចូលប្រើគណនី (ADMIN/LEGACY)</span>
                <div className="h-px bg-purple-600 flex-1"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="email" placeholder="អ៊ីមែល (Email)" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 pl-10 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400" />
                </div>
                <div className="relative">
                    <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="password" placeholder="ពាក្យសម្ងាត់ (Password)" value={pass} onChange={e => setPass(e.target.value)} required className="w-full p-3 pl-10 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400" />
                </div>
                <button type="submit" className="w-full bg-teal-500 text-white p-3 rounded font-bold hover:bg-teal-600 transition shadow-lg">ចូលគណនី</button>
            </form>
        </div>
    );
};

// --- 8. MAIN APP COMPONENT ---
const App = () => {
    const [page, setPage] = useState('DASHBOARD');
    const [userId, setUserId] = useState(null);
    const [userProfile, setUserProfile] = useState({});
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [notification, setNotification] = useState(null);
    // Removed authPage state as we only show one view now
    const [globalConfig, setGlobalConfig] = useState(defaultGlobalConfig);
    const [googleAccessToken, setGoogleAccessToken] = useState(null);

    // --- ADMIN CONFIGURATION (UID CHECK) ---
    const ADMIN_UIDS = ["48wx8GPZbVYSxmfws1MxbuEOzsE3"]; 
    const isAdmin = userId && ADMIN_UIDS.includes(userId);

    const showNotification = useCallback((msg, type = 'info') => {
        setNotification({ message: msg, type });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    useEffect(() => {
        if (!auth) return;
        return onAuthStateChanged(auth, (user) => {
            if (user) setUserId(user.uid);
            else { setUserId(null); setPage('DASHBOARD'); }
            setIsAuthReady(true);
        });
    }, []);

    useEffect(() => {
        if (!db || !userId) return;
        return onSnapshot(getProfileDocRef(userId), (doc) => {
            if (doc.exists()) setUserProfile({ ...doc.data(), id: userId });
        });
    }, [db, userId]);

    useEffect(() => {
        if (!db) return;
        return onSnapshot(getGlobalConfigDocRef(), (doc) => {
            if (doc.exists()) setGlobalConfig({ ...defaultGlobalConfig, ...doc.data() });
        });
    }, [db]);

    const handleLogin = async (email, password) => {
        try { await signInWithEmailAndPassword(auth, email, password); showNotification('ចូលគណនីជោគជ័យ', 'success'); }
        catch (e) { showNotification('បរាជ័យ: ' + e.code, 'error'); }
    };

    // handleRegister Removed from usage, keeping logic minimal just in case, but not exposed in UI

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/youtube.force-ssl');

            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            setGoogleAccessToken(token);

            const user = result.user;
            const uid = user.uid;
            const userDocRef = getProfileDocRef(uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                 const shortId = getShortId(uid);
                 const bonusPoints = 5000;
                 await setDoc(userDocRef, {
                    userId: uid,
                    email: user.email,
                    userName: user.displayName || `User_${shortId}`,
                    points: bonusPoints,
                    totalEarned: bonusPoints,
                    // NEW: Initialize realBalance for money
                    realBalance: 0, 
                    shortId,
                    createdAt: serverTimestamp(),
                    referredBy: null
                });
                await setDoc(getShortCodeDocRef(shortId), { fullUserId: uid, shortId });
                showNotification('គណនីថ្មីត្រូវបានបង្កើតដោយជោគជ័យ!', 'success');
            } else {
                showNotification('ចូលគណនីជោគជ័យ', 'success');
            }
        } catch (error) {
            console.error(error);
            showNotification('បរាជ័យ: ' + error.message, 'error');
        }
    };

    const handleLogout = async () => { await signOut(auth); showNotification('បានចាកចេញ', 'success'); };

    const handleDailyCheckin = async () => {
        try {
            await runTransaction(db, async (tx) => {
                const dailyRef = getDailyStatusDocRef(userId);
                const dailyDoc = await tx.get(dailyRef);
                if (dailyDoc.exists() && dailyDoc.data().checkinDone) throw new Error("ALREADY_CHECKED_IN");
               
                tx.update(getProfileDocRef(userId), { 
                    points: increment(globalConfig.dailyCheckinReward),
                    totalEarned: increment(globalConfig.dailyCheckinReward) 
                });
                tx.set(dailyRef, { checkinDone: true, date: getTodayDateKey() }, { merge: true });

                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                tx.set(historyRef, {
                    title: 'Daily Check-in',
                    amount: globalConfig.dailyCheckinReward,
                    date: serverTimestamp(),
                    type: 'checkin'
                });
            });
            showNotification('Check-in ជោគជ័យ!', 'success');
        } catch (e) { 
           if (e.message === "ALREADY_CHECKED_IN") showNotification('បាន Check-in រួចហើយ!', 'info');
           else { console.error(e); showNotification('មានបញ្ហា!', 'error'); }
        }
    };

    if (!isAuthReady) return <Loading />;

    if (!userId) return (
        <div className="min-h-screen bg-purple-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-6">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">MSL Booster</h2>
                    <p className="text-purple-300 text-sm">សូមស្វាគមន៍មកកាន់ MSL Booster</p>
                </div>
                
                <AuthForm 
                    onSubmit={handleLogin} 
                    btnText="ចូល" 
                    onGoogleLogin={handleGoogleLogin}
                />
            </Card>
            {notification && <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-2 rounded text-white bg-red-500`}>{notification.message}</div>}
        </div>
    );

    let Content;
    switch (page) {
        case 'EARN_POINTS': Content = <EarnPage db={db} userId={userId} type="view" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_WEBSITE': Content = <EarnPage db={db} userId={userId} type="website" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_SUBSCRIPTION': Content = <EarnPage db={db} userId={userId} type="sub" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} googleAccessToken={googleAccessToken} />; break;
        case 'MY_CAMPAIGNS': Content = <MyCampaignsPage db={db} userId={userId} userProfile={userProfile} setPage={setPage} showNotification={showNotification} />; break;
        case 'REFERRAL_PAGE': Content = <ReferralPage db={db} userId={userId} userProfile={userProfile} showNotification={showNotification} setPage={setPage} globalConfig={globalConfig} />; break;
        case 'BUY_COINS': Content = <BuyCoinsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'BALANCE_DETAILS': Content = <BalanceDetailsPage db={db} userId={userId} setPage={setPage} userProfile={userProfile} globalConfig={globalConfig} showNotification={showNotification} />; break;
        case 'WATCH_ADS': Content = <WatchAdsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_PLAN': Content = <MyPlanPage setPage={setPage} />; break;
        case 'ADMIN_DASHBOARD': Content = <AdminDashboardPage db={db} setPage={setPage} showNotification={showNotification} />; break;
        default:
            Content = (
                <div className="min-h-screen bg-purple-900 pb-16 pt-20">
                    <Header 
                        title="MSL Booster" 
                        className="z-20" 
                        rightContent={
                            <div className="flex space-x-2">
                                {isAdmin && (
                                    <button onClick={() => setPage('ADMIN_DASHBOARD')} className="bg-red-500 text-white p-1 rounded shadow"><Settings size={20}/></button>
                                )}
                                <button onClick={handleLogout} className="bg-gray-600 text-white p-1 rounded shadow"><LogOut size={20}/></button>
                            </div>
                        }
                    />
                   
                    <div className="px-4 mb-6">
                        <div className="bg-gradient-to-r from-teal-500 to-teal-700 rounded-xl p-6 text-white shadow-lg text-center relative overflow-hidden border border-teal-400/30">
                            <div className="absolute -top-4 -left-4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
                            <p className="text-sm opacity-80">សមតុល្យរបស់អ្នក</p>
                            <h1 className="text-4xl font-bold my-2 flex justify-center items-center gap-2">{formatNumber(userProfile.points)} <Coins className="w-6 h-6 text-yellow-300" /></h1>
                            <p className="text-xs bg-white bg-opacity-20 inline-block px-3 py-1 rounded-full">ID: {userProfile.shortId}</p>
                        </div>
                    </div>
                    <div className="px-4">
                        <Card className="p-4 grid grid-cols-3 gap-3">
                            <IconButton 
                                icon={CalendarCheck} 
                                title="DAILY TASK" 
                                onClick={handleDailyCheckin} 
                                iconColor={userProfile.dailyCheckin ? 'text-gray-500' : 'text-blue-400'} 
                                textColor={userProfile.dailyCheckin ? 'text-gray-400' : 'text-white'} 
                                disabled={!!userProfile.dailyCheckin} 
                            />
                            <IconButton icon={UserCheck} title="SUBSCRIBE" onClick={() => setPage('EXPLORE_SUBSCRIPTION')} iconColor="text-pink-400" />
                            <IconButton icon={Film} title="PLAY VIDEO" onClick={() => setPage('EARN_POINTS')} iconColor="text-red-400" />
                            <IconButton icon={Wallet} title="MY BALANCE" onClick={() => setPage('BALANCE_DETAILS')} iconColor="text-orange-400" />
                            
                            <IconButton 
                                icon={ShoppingCart} 
                                title="BUY COINS" 
                                onClick={() => {
                                    if(globalConfig.enableBuyCoins) setPage('BUY_COINS');
                                    else showNotification('ឆាប់ៗនេះ (Coming Soon)!', 'info');
                                }} 
                                iconColor="text-purple-400" 
                            />

                            <IconButton icon={Target} title="CAMPAIGNS" onClick={() => setPage('MY_CAMPAIGNS')} iconColor="text-teal-400" />
                            <IconButton icon={UserPlus} title="ណែនាំមិត្ត" onClick={() => setPage('REFERRAL_PAGE')} iconColor="text-blue-400" />
                            <IconButton icon={Globe} title="មើល WEBSITE" onClick={() => setPage('EXPLORE_WEBSITE')} iconColor="text-indigo-400" />
                            <IconButton icon={MonitorPlay} title="មើល ADS" onClick={() => setPage('WATCH_ADS')} iconColor="text-pink-400" />
                        </Card>
                    </div>

                    <div className="px-4 mt-6">
                        <div className="w-full bg-white h-20 flex flex-col items-center justify-center rounded-lg border-2 border-yellow-500/50 shadow-lg relative overflow-hidden">
                             <div className="absolute top-0 right-0 bg-yellow-500 text-purple-900 text-[10px] px-2 font-bold">AD</div>
                            <MonitorPlay className="w-6 h-6 text-gray-400 mb-1" />
                            <p className="text-xs text-gray-500 font-mono">{globalConfig.adsSettings?.bannerId || 'Banner Ad Space'}</p>
                        </div>
                    </div>
                </div>
            );
    }

    return (
        <div className="font-sans bg-purple-900 min-h-screen relative">
            {Content}
            {notification && <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-50 text-white font-bold transition-all ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>{notification.message}</div>}
        </div>
    );
};

export default App;
