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
    ArrowUpRight, ArrowDownLeft, Clock, ChevronDown
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

// Default Config
const defaultGlobalConfig = {
    dailyCheckinReward: 200,
    referrerReward: 1000,
    referredBonus: 500,
    adsReward: 30,
    maxDailyAds: 15,
    enableBuyCoins: false,
    exchangeRate: 10000, // 10,000 Coins = $1.00
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
        setConfig(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
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
                <h3 className="font-bold text-lg mb-3 text-yellow-400 flex items-center"><Coins className="w-5 h-5 mr-2"/> ការកំណត់រង្វាន់</h3>
                <div className="grid grid-cols-1 gap-3">
                    <div><label className="text-xs font-bold text-purple-300">Daily Check-in Points</label><InputField name="dailyCheckinReward" type="number" min="0" value={config.dailyCheckinReward || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Referral Reward Points</label><InputField name="referrerReward" type="number" min="0" value={config.referrerReward || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Referred User Bonus</label><InputField name="referredBonus" type="number" min="0" value={config.referredBonus || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Watch Ads Reward</label><InputField name="adsReward" type="number" min="0" value={config.adsReward || 0} onChange={handleChange} /></div>
                    
                    {/* EXCHANGE RATE */}
                    <div className="pt-3 border-t border-purple-600 mt-2 bg-purple-900/30 p-2 rounded">
                        <label className="text-xs font-bold text-green-400 flex justify-between">
                            <span>អត្រាប្ដូរប្រាក់ (Exchange Rate)</span>
                            <span className="text-white opacity-70">Coins to $1.00</span>
                        </label>
                        <p className="text-[10px] text-gray-400 mb-1">ចំនួនកាក់ដែលស្មើនឹង $1 (Default: 10000)</p>
                        <InputField name="exchangeRate" type="number" min="1" value={config.exchangeRate || 10000} onChange={handleChange} className="border-green-500 text-green-300" />
                    </div>

                    <div className="pt-3 border-t border-purple-600 mt-2">
                        <label className="text-xs font-bold text-yellow-300">ចំនួនមើលពាណិជ្ជកម្មក្នុងមួយថ្ងៃ (Max Daily Ads)</label>
                        <InputField name="maxDailyAds" type="number" min="1" value={config.maxDailyAds || 15} onChange={handleChange} />
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
                        <p className="text-purple-300 text-sm mb-2">Current Points: <span className="font-bold text-yellow-400">{formatNumber(foundUser.points)}</span></p>
                        
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
    const [withdrawals, setWithdrawals] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), orderBy('date', 'desc'), limit(50));
        return onSnapshot(q, (snap) => {
            setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [db]);

    const handleAction = async (item, action) => {
        const confirmMsg = action === 'approved' ? 'យល់ព្រមឱ្យដកលុយ?' : 'បដិសេធសំណើនេះ (លុយនឹងបង្វិលចូលគណនីវិញ)?';
        if(!window.confirm(confirmMsg)) return;

        try {
            await runTransaction(db, async (tx) => {
                const withdrawRef = doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', item.id);
                
                if (action === 'rejected') {
                    // Refund money if rejected
                    const userRef = getProfileDocRef(item.userId);
                    tx.update(userRef, { balance: increment(item.amount) });
                    
                    // Add history
                    const historyRef = doc(collection(db, 'artifacts', appId, 'users', item.userId, 'history'));
                    tx.set(historyRef, {
                        title: 'Withdrawal Rejected (Refund)',
                        amount: 0,
                        moneyEarned: item.amount,
                        date: serverTimestamp(),
                        type: 'refund'
                    });
                }

                tx.update(withdrawRef, { status: action });
            });
            showNotification(`Success: ${action.toUpperCase()}`, 'success');
        } catch(e) {
            showNotification(e.message, 'error');
        }
    };

    return (
        <div className="space-y-3 pb-10">
            <h3 className="text-white font-bold border-b border-gray-600 pb-2">សំណើដកលុយ ({withdrawals.filter(w => w.status === 'pending').length} Pending)</h3>
            {withdrawals.map(w => (
                <div key={w.id} className={`p-3 rounded-lg border ${w.status === 'pending' ? 'bg-purple-800 border-yellow-500' : 'bg-gray-800 border-gray-700 opacity-70'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${w.status === 'pending' ? 'bg-yellow-500 text-black' : w.status === 'approved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {w.status.toUpperCase()}
                                </span>
                                <span className="text-white font-bold text-sm">{w.userName}</span>
                            </div>
                            <p className="text-green-400 font-bold text-lg mt-1">${formatNumber(w.amount)}</p>
                            <div className="text-xs text-purple-200 mt-1 bg-purple-900/50 p-2 rounded">
                                <p>Bank: <span className="font-bold text-white">{w.bankName}</span></p>
                                <p>Acc Name: <span className="font-bold text-white">{w.accountName}</span></p>
                                <p>Acc Num: <span className="font-bold text-yellow-300 font-mono">{w.accountNumber}</span></p>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">{w.date?.toDate().toLocaleString()}</p>
                        </div>
                        
                        {w.status === 'pending' && (
                            <div className="flex flex-col space-y-2">
                                <button onClick={() => handleAction(w, 'approved')} className="bg-green-600 text-white p-2 rounded text-xs font-bold hover:bg-green-700">APPROVE</button>
                                <button onClick={() => handleAction(w, 'rejected')} className="bg-red-600 text-white p-2 rounded text-xs font-bold hover:bg-red-700">REJECT</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {withdrawals.length === 0 && <p className="text-center text-gray-500">No requests.</p>}
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
                if (docSnap.exists()) {
                    setConfig({ ...defaultGlobalConfig, ...docSnap.data() });
                } else {
                    setConfig(defaultGlobalConfig);
                }
            } catch(e) {
                setConfig(defaultGlobalConfig);
            }
        };
        fetchConfig();
    }, [db]);

    useEffect(() => {
        if(activeTab === 'CAMPAIGNS') {
            const q = query(getCampaignsCollectionRef(), limit(50));
            return onSnapshot(q, (snap) => {
                setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        }
    }, [db, activeTab]);

    const handleSaveConfig = async () => {
        try {
            await setDoc(getGlobalConfigDocRef(), config);
            showNotification('Settings saved successfully!', 'success');
        } catch(e) { showNotification('Failed to save', 'error'); }
    };

    const handleDeleteCampaign = async (id) => {
        if(!window.confirm('Stop this campaign?')) return;
        try { await deleteDoc(doc(getCampaignsCollectionRef(), id)); showNotification('Deleted!', 'success'); }
        catch(e) {}
    };

    if (!config) return <Loading />;

    return (
        <div className="min-h-screen bg-purple-950 pb-16 pt-20">
            <Header title="ADMIN PANEL" onBack={() => setPage('DASHBOARD')} className="bg-purple-900" />
            <main className="p-4">
                <div className="flex space-x-1 mb-4 bg-purple-800 p-1 rounded-lg overflow-x-auto">
                    {['SETTINGS', 'USERS', 'CAMPAIGNS', 'WITHDRAWALS'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 px-2 rounded-lg font-bold text-[10px] whitespace-nowrap transition ${activeTab === tab ? 'bg-teal-600 text-white shadow' : 'text-purple-300 hover:bg-purple-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'SETTINGS' && <AdminSettingsTab config={config} setConfig={setConfig} onSave={handleSaveConfig} />}
                {activeTab === 'USERS' && <AdminUserManagerTab db={db} showNotification={showNotification} />}
                {activeTab === 'WITHDRAWALS' && <AdminWithdrawalsTab db={db} showNotification={showNotification} />}
               
                {activeTab === 'CAMPAIGNS' && (
                    <div className="space-y-2 pb-10">
                        {campaigns.map(c => (
                            <div key={c.id} className={`bg-purple-800 p-3 rounded-lg shadow flex justify-between items-center border-l-4 ${c.remaining > 0 ? 'border-green-500' : 'border-red-500'}`}>
                                <div className='overflow-hidden'>
                                    <p className="font-bold text-sm truncate text-white w-48">{c.link}</p>
                                    <div className='flex space-x-2 text-xs mt-1'>
                                        <span className='bg-purple-900 px-2 py-0.5 rounded text-purple-200'>{c.type}</span>
                                        <span className={`${c.remaining > 0 ? 'text-green-400' : 'text-red-400'} font-bold`}>
                                            Rem: {c.remaining}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))}
                        {campaigns.length === 0 && <p className="text-purple-300 text-center opacity-50">No campaigns found.</p>}
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
        const unsub = onSnapshot(q, (snap) => {
            setReferrals(snap.docs.map(d => d.data()));
        });
        return () => unsub();
    }, [db, userId]);

    const handleSubmitCode = async () => {
        const code = inputCode.toUpperCase().trim();
       
        if (code.length !== 6) return showNotification('កូដត្រូវតែមាន ៦ ខ្ទង់', 'error');
        if (code === shortId) return showNotification('មិនអាចដាក់កូដខ្លួនឯងបានទេ!', 'error');
        if (userProfile.referredBy) return showNotification('អ្នកមានអ្នកណែនាំរួចហើយ', 'error');

        setIsSubmitting(true);
        try {
            await runTransaction(db, async (transaction) => {
                const shortCodeRef = getShortCodeDocRef(code);
                const shortCodeDoc = await transaction.get(shortCodeRef);
                if (!shortCodeDoc.exists()) throw new Error("កូដអ្នកណែនាំមិនត្រឹមត្រូវ");

                const referrerId = shortCodeDoc.data().fullUserId;
               
                const userRef = getProfileDocRef(userId);
                const userDoc = await transaction.get(userRef);
                if (userDoc.data().referredBy) throw new Error("អ្នកមានអ្នកណែនាំរួចហើយ");

                const referrerRef = getProfileDocRef(referrerId);
              
                // UPDATE TOTAL EARNED FOR REFERRER
                transaction.update(referrerRef, {
                    points: increment(globalConfig.referrerReward),
                    totalEarned: increment(globalConfig.referrerReward)
                });
              
                const referrerHistoryRef = doc(collection(db, 'artifacts', appId, 'users', referrerId, 'history'));
                transaction.set(referrerHistoryRef, {
                    title: 'Referral Reward',
                    amount: globalConfig.referrerReward,
                    date: serverTimestamp(),
                    type: 'referral'
                });

                const bonus = globalConfig.referredBonus || 500;
                // UPDATE TOTAL EARNED FOR CURRENT USER
                transaction.update(userRef, {
                    referredBy: code,
                    points: increment(bonus),
                    totalEarned: increment(bonus)
                });
                const myHistoryRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(myHistoryRef, {
                    title: 'Entered Code Bonus',
                    amount: bonus,
                    date: serverTimestamp(),
                    type: 'referral_code'
                });

                const newReferralRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'referrals'));
                transaction.set(newReferralRef, {
                    referrerId: referrerId,
                    referredUserId: userId,
                    referredName: userProfile.userName || 'Unknown',
                    reward: globalConfig.referrerReward,
                    timestamp: serverTimestamp()
                });
            });
           
            showNotification(`ជោគជ័យ! ទទួលបាន +${formatNumber(globalConfig.referredBonus || 500)} Points`, 'success');
            setInputCode('');
        } catch (e) {
            showNotification(e.message, 'error');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="ណែនាំមិត្ត" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
               
                {/* YOUR CODE */}
                <Card className="p-6 text-center bg-purple-800 border-2 border-yellow-500/50">
                    <h3 className="font-bold text-white text-lg">កូដណែនាំរបស់អ្នក</h3>
                    <div className="text-4xl font-mono font-extrabold text-yellow-400 my-4 tracking-widest bg-purple-900 p-2 rounded-lg shadow-inner">{shortId}</div>
                    <p className="text-sm text-purple-200 font-medium">ទទួលបាន <span className='text-green-400 font-bold'>{formatNumber(globalConfig.referrerReward)} ពិន្ទុ!</span> ក្នុងម្នាក់</p>
                    <button onClick={() => {navigator.clipboard.writeText(shortId); showNotification('ចម្លងរួចរាល់!', 'success')}} className="mt-5 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center justify-center mx-auto shadow-lg active:scale-95 transition">
                        <Copy className='w-4 h-4 mr-2'/> ចម្លងកូដ
                    </button>
                </Card>

                {/* INPUT REFERRER CODE */}
                <Card className="p-4 border border-teal-500/30 bg-gradient-to-br from-purple-800 to-purple-900">
                    <h3 className="font-bold text-white mb-2 flex items-center"><UserPlus className="w-4 h-4 mr-2"/> ដាក់កូដអ្នកណែនាំ</h3>
                   
                    {userProfile.referredBy ? (
                        <div className="bg-purple-950/50 p-3 rounded border border-purple-700 text-center">
                            <p className="text-purple-300 text-sm">អ្នកត្រូវបានណែនាំដោយ៖</p>
                            <p className="text-xl font-mono font-bold text-yellow-400 mt-1">{userProfile.referredBy}</p>
                            <p className="text-xs text-green-400 mt-1 flex justify-center items-center"><CheckCircle size={12} className="mr-1"/> បានទទួលរង្វាន់រួចរាល់</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-purple-200 mb-3">ដាក់កូដដើម្បីទទួលបាន <span className="text-yellow-400 font-bold">+{formatNumber(globalConfig.referredBonus || 500)} Points</span> បន្ថែម!</p>
                            <div className="flex">
                                <input
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    placeholder="បញ្ចូលកូដ ៦ ខ្ទង់"
                                    maxLength={6}
                                    disabled={isSubmitting}
                                    className="flex-1 p-3 bg-white text-black font-bold placeholder-gray-500 rounded-l-lg focus:outline-none uppercase"
                                />
                                <button
                                    onClick={handleSubmitCode}
                                    disabled={isSubmitting || inputCode.length !== 6}
                                    className={`px-6 font-bold text-white rounded-r-lg transition ${isSubmitting || inputCode.length !== 6 ? 'bg-gray-500' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                                >
                                    {isSubmitting ? '...' : 'OK'}
                                </button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* REFERRAL LIST */}
                <Card className="p-4">
                    <h3 className="font-bold mb-4 text-white border-b border-purple-600 pb-2">បញ្ជីអ្នកដែលបានណែនាំ ({referrals.length})</h3>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {referrals.length > 0 ? referrals.map((r, i) => (
                            <div key={i} className="flex justify-between items-center bg-purple-700 p-3 rounded-lg border border-purple-600">
                                <span className="text-white font-semibold text-sm">{i+1}. {r.referredName || 'User'}</span>
                                <span className="text-green-400 font-bold text-sm">+{formatNumber(r.reward)}</span>
                            </div>
                        )) : <div className="text-center py-8 text-purple-400 text-sm">មិនទាន់មានការណែនាំ</div>}
                    </div>
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
    const [previewUrl, setPreviewUrl] = useState(null);

    // Modal Control States
    const [showViewPicker, setShowViewPicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // PREDEFINED OPTIONS
    const VIEW_OPTIONS = [10, 20, 30, 40, 50, 100, 200, 500, 1000];
    const TIME_OPTIONS = [60, 90, 120, 150, 180, 210, 240, 300, 600];

    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('userId', '==', userId));
        return onSnapshot(q, (snap) => {
            setUserCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
        });
    }, [db, userId]);

    const calculateCost = useCallback(() => {
        const c = parseInt(count) || 0;
        const t = parseInt(time) || 0;
        return type === 'sub' ? c * 50 : c * t * 1;
    }, [type, count, time]);

    const handleCheckLink = (e) => {
        e.preventDefault();
        if(!link.trim()) return showNotification('សូមបញ្ចូល Link ជាមុនសិន', 'error');
       
        if (type === 'view' || type === 'sub') {
            const embed = getEmbedUrl(link);
            if(!embed) return showNotification('Link YouTube មិនត្រឹមត្រូវ', 'error');
            setPreviewUrl(embed);
        } else {
            if(!link.startsWith('http')) return showNotification('Link ត្រូវតែមាន http:// ឬ https://', 'error');
            setPreviewUrl(null);
        }
       
        setIsLinkVerified(true);
        showNotification('Link ត្រឹមត្រូវ!', 'success');
    };

    const handleResetLink = () => {
        setLink('');
        setIsLinkVerified(false);
        setPreviewUrl(null);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cost = calculateCost();
        if (!link.trim() || count < 1 || cost > userProfile.points) {
            showNotification('សូមពិនិត្យ Link ឬពិន្ទុរបស់អ្នក!', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await runTransaction(db, async (transaction) => {
                const profileRef = getProfileDocRef(userId);
                const profileDoc = await transaction.get(profileRef);
                if (!profileDoc.exists() || profileDoc.data().points < cost) throw new Error("Insufficient points");
              
                transaction.update(profileRef, { points: increment(-cost) });
              
                const newCampRef = doc(getCampaignsCollectionRef());
                transaction.set(newCampRef, { 
                    userId, 
                    type, 
                    link: link.trim(), 
                    costPerUnit: type === 'sub' ? 50 : 1, 
                    requiredDuration: type === 'sub' ? 60 : (parseInt(time) || 60), 
                    initialCount: parseInt(count), 
                    remaining: parseInt(count), 
                    totalCost: cost, 
                    createdAt: serverTimestamp(), 
                    isActive: true 
                });
               
                // SAVE HISTORY
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(historyRef, {
                    title: `Create ${type.toUpperCase()} Campaign`,
                    amount: -cost,
                    date: serverTimestamp(),
                    type: 'campaign'
                });
            });
            showNotification('ដាក់យុទ្ធនាការជោគជ័យ!', 'success');
            setLink('');
            setIsLinkVerified(false);
            setPreviewUrl(null);
            setCount(10);
        } catch (error) { showNotification(error.message, 'error'); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] pb-16 pt-20">
            <Header title="យុទ្ធនាការខ្ញុំ" onBack={() => setPage('DASHBOARD')} />
            <main className="p-0">
                {isLinkVerified && previewUrl && (
                    <div className="w-full aspect-video bg-black mb-4">
                        <iframe src={previewUrl} className="w-full h-full" frameBorder="0" allowFullScreen title="preview" />
                    </div>
                )}

                <div className="px-4 space-y-4">
                    <div className="bg-[#0f172a] p-2">
                        <div className="flex space-x-2 mb-4">
                            {['view', 'sub', 'website'].map(t => (
                                <button key={t} onClick={() => {setType(t); setIsLinkVerified(false); setPreviewUrl(null);}} className={`flex-1 py-2 rounded font-bold text-xs ${type === t ? 'bg-[#4c1d95] text-white border-b-2 border-teal-400' : 'bg-gray-800 text-gray-400'}`}>{t.toUpperCase()}</button>
                            ))}
                        </div>

                        <form onSubmit={isLinkVerified ? handleSubmit : handleCheckLink} className="space-y-3">
                            <div className="flex">
                                <input
                                    value={link}
                                    onChange={e => {setLink(e.target.value); setIsLinkVerified(false);}}
                                    placeholder={type === 'website' ? "https://yoursite.com" : "https://youtu.be/..."}
                                    required
                                    disabled={isLinkVerified}
                                    className="flex-1 p-3 bg-white text-black placeholder-gray-500 border-none rounded-l-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                                <button
                                    type={isLinkVerified ? 'button' : 'submit'}
                                    onClick={isLinkVerified ? handleResetLink : undefined}
                                    className={`px-6 font-bold text-white rounded-r-md transition ${isLinkVerified ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {isLinkVerified ? 'X' : 'CHECK'}
                                </button>
                            </div>

                            {isLinkVerified && (
                                <div className='mt-4 space-y-4'>
                                    <h3 className='text-white font-bold text-sm border-b border-gray-600 pb-2'>Campaigns Setting</h3>
                                   
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-white font-bold text-sm">Number of views</label>
                                        <div 
                                            onClick={() => setShowViewPicker(true)}
                                            className="w-32 p-2 bg-white text-black text-center font-bold rounded-full border-none cursor-pointer flex items-center justify-center active:scale-95 transition"
                                        >
                                            {count} <ChevronDown size={16} className="ml-1"/>
                                        </div>
                                    </div>

                                    {type !== 'sub' && (
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-white font-bold text-sm">Time Required (sec.)</label>
                                            <div 
                                                onClick={() => setShowTimePicker(true)}
                                                className="w-32 p-2 bg-white text-black text-center font-bold rounded-full border-none cursor-pointer flex items-center justify-center active:scale-95 transition"
                                            >
                                                {time} <ChevronDown size={16} className="ml-1"/>
                                            </div>
                                        </div>
                                    )}
                                   
                                    <div className="flex justify-between items-center mb-4 pt-2 border-t border-gray-600">
                                        <label className="text-white font-bold text-sm">Campaign Cost</label>
                                        <span className='text-xl font-bold text-yellow-500'>{formatNumber(calculateCost())}</span>
                                    </div>

                                    <button type="submit" disabled={isSubmitting} className="w-full bg-yellow-600 text-white py-3 rounded-full font-bold shadow-lg hover:bg-yellow-700 transition mt-4">
                                        {isSubmitting ? 'Processing...' : 'DONE'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="space-y-2 mt-6">
                        <h3 className="text-gray-400 font-bold text-xs uppercase">Recent Campaigns</h3>
                        {userCampaigns.map(c => (
                            <div key={c.id} className="bg-gray-800 p-3 rounded shadow flex justify-between items-center border-l-4 border-teal-500">
                                <div className='w-2/3'><p className="font-bold text-xs truncate text-gray-300">{c.link}</p><p className="text-[10px] text-gray-500">{c.type.toUpperCase()} - Rem: {c.remaining}</p></div>
                                <span className={`text-xs font-bold ${c.remaining > 0 ? 'text-green-400' : 'text-red-400'}`}>{c.remaining > 0 ? 'Active' : 'Finished'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <SelectionModal 
                    isOpen={showViewPicker} 
                    onClose={() => setShowViewPicker(false)} 
                    title="Choose Number of views" 
                    options={VIEW_OPTIONS}
                    onSelect={setCount}
                />

                <SelectionModal 
                    isOpen={showTimePicker} 
                    onClose={() => setShowTimePicker(false)} 
                    title="Choose Number of Seconds" 
                    options={TIME_OPTIONS}
                    onSelect={setTime}
                />

            </main>
        </div>
    );
};

const EarnPage = ({ db, userId, type, setPage, showNotification, globalConfig, googleAccessToken }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [current, setCurrent] = useState(null);
    
    // UPDATE: Start timer at -1 to prevent instant claim on video switch
    const [timer, setTimer] = useState(-1); 
    const [claimed, setClaimed] = useState(false);
    const [autoPlay, setAutoPlay] = useState(true);
    const isMounted = useRef(true);

    // --- ADDED: WATCHED LIST ---
    const [watchedIds, setWatchedIds] = useState(new Set());

    // Fetch Watched Campaigns on Mount
    useEffect(() => {
        if (!userId) return;
        const fetchWatched = async () => {
            try {
                const watchedSnap = await getDocs(collection(db, 'artifacts', appId, 'users', userId, 'watched'));
                const ids = new Set(watchedSnap.docs.map(d => d.id));
                setWatchedIds(ids);
            } catch(e) { console.error(e); }
        };
        fetchWatched();
    }, [userId, db]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('type', '==', type), limit(50));
        return onSnapshot(q, (snap) => {
            if(!isMounted.current) return;
            const list = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                // FILTER: Exclude own campaigns AND watched campaigns
                .filter(c => c.userId !== userId && c.remaining > 0 && c.isActive !== false && !watchedIds.has(c.id));
           
            setCampaigns(list);
            // Only set current if not already playing or if current was removed
            if (!current && list.length > 0) setCurrent(list[0]);
        });
    }, [db, userId, type, watchedIds]); // Add watchedIds to dependency

    useEffect(() => {
        if (current) { 
            setTimer(current.requiredDuration || 30); 
            setClaimed(false); 
        }
    }, [current]);
   
    useEffect(() => {
        let interval = null;
        // Only countdown if timer > 0
        if (timer > 0 && !claimed) {
            interval = setInterval(() => {
                setTimer(t => Math.max(0, t - 1));
            }, 1000);
        } else if (timer === 0 && !claimed && current) {
            // Auto Claim Logic (Only for View/Website)
            if (type !== 'sub') handleClaim();
        }
       
        return () => clearInterval(interval);
    }, [timer, claimed, current, type]);

    const handleClaim = async () => {
        if (claimed || !current) return;
       
        // Prevent claim if timer is not 0 (or if it's -1 loading state)
        if (timer !== 0) {
            return; 
        }

        setClaimed(true);
        try {
            await runTransaction(db, async (transaction) => {
                const campRef = doc(getCampaignsCollectionRef(), current.id);
                const campDoc = await transaction.get(campRef);
                if (!campDoc.exists() || campDoc.data().remaining <= 0) throw new Error("Campaign finished");
               
                transaction.update(getProfileDocRef(userId), {
                    points: increment(current.requiredDuration || 50),
                    totalEarned: increment(current.requiredDuration || 50)
                });
                transaction.update(campRef, { remaining: increment(-1) });

                // SAVE HISTORY
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(historyRef, {
                    title: type === 'view' ? 'Watched Video' : type === 'sub' ? 'Subscribed Channel' : 'Visited Website',
                    amount: current.requiredDuration || 50,
                    date: serverTimestamp(),
                    type: 'earn'
                });

                // --- ADD TO WATCHED LIST ---
                const watchedRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'watched'), current.id);
                transaction.set(watchedRef, { date: serverTimestamp() });
            });
           
            // Update local state to hide this video immediately
            setWatchedIds(prev => new Set(prev).add(current.id));

            if(isMounted.current) showNotification('Success! Points Added.', 'success');
           
            // AUTO NEXT
            if(autoPlay && isMounted.current) {
                handleNext();
            }
        } catch (e) { if(isMounted.current) showNotification('បរាជ័យ: ' + e.message, 'error'); }
    };

    const handleNext = () => {
        setTimer(-1); // Reset Timer immediately
        setClaimed(false);
       
        // Re-filter logic with updated watchedIds
        const nextList = campaigns.filter(c => c.id !== current?.id && !watchedIds.has(c.id));
        setCurrent(nextList[0] || null);
    }

    const handleSubscribeClick = async () => {
        if(!current) return;

        if (timer > 0) {
            showNotification(`សូមរង់ចាំ ${timer} វិនាទីទៀត!`, 'error');
            return;
        }

        if (!googleAccessToken) {
            showNotification('សូម Login តាម Google ម្តងទៀតដើម្បីផ្តល់សិទ្ធិ!', 'error');
            return;
        }

        try {
            const videoId = getYouTubeID(current.link);
            if (!videoId) throw new Error("Invalid Video Link");

            const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&access_token=${googleAccessToken}`);
            const videoData = await videoResponse.json();
           
            if (!videoData.items || videoData.items.length === 0) throw new Error("រកវីដេអូមិនឃើញ");
            const channelId = videoData.items[0].snippet.channelId;

            const subResponse = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&access_token=${googleAccessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snippet: {
                        resourceId: { kind: 'youtube#channel', channelId: channelId }
                    }
                })
            });

            if (subResponse.ok) {
                showNotification('បាន Subscribe ដោយជោគជ័យ!', 'success');
                handleClaim(); 
            } else {
                const errorData = await subResponse.json();
                if (errorData.error?.errors?.[0]?.reason === 'subscriptionDuplicate') {
                    showNotification('អ្នកបាន Subscribe រួចហើយ!', 'success');
                    handleClaim();
                } else {
                    throw new Error(errorData.error?.message || 'Subscribe Failed');
                }
            }

        } catch (error) {
            console.error(error);
            showNotification('បរាជ័យ៖ ' + error.message, 'error');
        }
    };

    const isVideo = type === 'view' || type === 'sub';
    const iframeSrc = current ? (isVideo ? getEmbedUrl(current.link) : current.link) : null;

    return (
        <div className="h-screen bg-[#0f172a] flex flex-col relative">
            <Header title={type === 'view' ? 'មើលវីដេអូ' : type === 'website' ? 'មើល Website' : 'Subscribe'} onBack={() => setPage('DASHBOARD')} className="relative" />
           
            <div className="flex-1 relative bg-black">
                {current ? (
                    iframeSrc ? (
                        <>
                            <iframe
                                src={iframeSrc}
                                className="w-full h-full absolute top-0 left-0"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="content-viewer"
                                sandbox={!isVideo ? "allow-scripts allow-same-origin allow-forms" : undefined}
                            />
                            {!isVideo && (
                                <button onClick={() => window.open(current.link)} className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white px-3 py-1 rounded text-xs flex items-center backdrop-blur-sm border border-white/20">
                                    <ExternalLink size={14} className="mr-1"/> Open External
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-white"><p>Invalid Link</p></div>
                    )
                ) : (
                     <div className="flex flex-col items-center justify-center h-full text-white"><RefreshCw className="animate-spin mb-4"/>កំពុងស្វែងរក...</div>
                )}
            </div>

            <div className="bg-white p-3 border-t border-gray-200 shadow-lg z-20 pb-24"> 
                 {current ? (
                    <div className="flex flex-col space-y-2">
                         <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-yellow-600 flex items-center"><Coins className="w-5 h-5 mr-1" /> {current.requiredDuration}</span>
                               
                                {timer > 0 ? (
                                    <div className="flex items-center bg-gradient-to-r from-red-100 to-pink-100 px-3 py-1 rounded-full border border-red-200">
                                        <Zap className="w-4 h-4 mr-1 text-red-500 animate-pulse" /> 
                                        <span className="text-red-600 font-bold text-sm">{timer}s</span>
                                    </div>
                                ) : (
                                    timer === -1 ? 
                                    <span className="text-gray-500 font-bold flex items-center bg-gray-200 px-2 py-0.5 rounded-full text-sm">...</span> :
                                    <span className="text-green-600 font-bold flex items-center bg-green-100 px-3 py-1 rounded-full text-sm border border-green-200"><CheckCircle className="w-4 h-4 mr-1" /> Ready</span>
                                )}
                            </div>
                           
                            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setAutoPlay(!autoPlay)}>
                                <span className={`text-xs font-bold ${autoPlay ? 'text-green-600' : 'text-gray-400'}`}>
                                    Auto Play {autoPlay ? 'ON' : 'OFF'}
                                </span>
                                <div className={`w-10 h-5 rounded-full p-1 transition-colors duration-300 flex items-center ${autoPlay ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${autoPlay ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            {type === 'sub' ? (
                                <button 
                                    onClick={handleSubscribeClick} 
                                    className={`flex-1 text-white py-3 rounded-lg font-bold shadow transition text-sm 
                                        bg-red-600 hover:bg-red-700 
                                        ${(timer > 0 || claimed || timer === -1) ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'}`}
                                    disabled={timer > 0 || claimed || timer === -1}
                                >
                                    {claimed ? 'CLAIMED' : `SUBSCRIBE ${timer > 0 ? `(${timer}s)` : ''}`}
                                </button>
                            ) : (
                                <button 
                                    onClick={handleClaim} 
                                    disabled={timer > 0 || claimed || timer === -1} 
                                    className={`flex-1 py-3 rounded-lg font-bold shadow text-sm text-white transition 
                                        ${claimed ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}
                                        ${(timer > 0 || timer === -1) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                >
                                    {claimed ? 'SUCCESS' : timer > 0 ? `WAIT ${timer}s` : timer === -1 ? 'LOADING...' : 'CLAIM REWARD'}
                                </button>
                            )}
                            <button onClick={handleNext} className="px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow active:scale-95 transition">
                                SKIP
                            </button>
                        </div>
                    </div>
                 ) : <div className="text-center text-gray-400 text-sm py-2">No active campaigns</div>}
            </div>

            <div className="absolute bottom-0 w-full bg-gray-100 border-t border-gray-300 h-16 flex items-center justify-center z-30">
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1 rounded mb-1">AD</span>
                    <p className="text-xs text-gray-500 font-mono">{globalConfig.adsSettings?.bannerId || 'Banner Ad Space'}</p>
                </div>
            </div>
        </div>
    );
};

// --- 3. UPDATED BALANCE PAGE (FIXED INPUT & ADDED WITHDRAW) ---
const BalanceDetailsPage = ({ db, userId, setPage, userProfile, globalConfig }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Exchange State
    const [showExchange, setShowExchange] = useState(false);
    const [exchangeAmount, setExchangeAmount] = useState('');
    
    // Withdraw State
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawBank, setWithdrawBank] = useState('ABA'); // ABA or ACLEDA
    const [withdrawAccName, setWithdrawAccName] = useState('');
    const [withdrawAccNum, setWithdrawAccNum] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const [processing, setProcessing] = useState(false);

    const EXCHANGE_RATE = globalConfig?.exchangeRate || 10000; 

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(getHistoryCollectionRef(userId), orderBy('date', 'desc'), limit(30));
        const unsub = onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching history:", error);
            setLoading(false);
        });
        return () => unsub();
    }, [db, userId]);

    // --- FUNCTION: EXCHANGE ---
    const handleExchange = async () => {
        const coinsToExchange = parseInt(exchangeAmount);
        if (!coinsToExchange || coinsToExchange <= 0) return alert("សូមបញ្ចូលចំនួនកាក់!");
        if (coinsToExchange > userProfile.points) return alert("ពិន្ទុមិនគ្រប់គ្រាន់!");

        const moneyReceived = coinsToExchange / EXCHANGE_RATE;
        if (!window.confirm(`ប្តូរ ${formatNumber(coinsToExchange)} Coins = $${moneyReceived.toFixed(4)}?`)) return;

        setProcessing(true);
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = getProfileDocRef(userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists() || userDoc.data().points < coinsToExchange) throw new Error("Error");

                transaction.update(userRef, {
                    points: increment(-coinsToExchange),
                    balance: increment(moneyReceived)
                });

                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(historyRef, {
                    title: 'Exchanged Coins',
                    amount: -coinsToExchange,
                    moneyEarned: moneyReceived,
                    date: serverTimestamp(),
                    type: 'exchange'
                });
            });
            alert("ជោគជ័យ!");
            setExchangeAmount('');
            setShowExchange(false);
        } catch (e) { alert("បរាជ័យ!"); } finally { setProcessing(false); }
    };

    // --- FUNCTION: WITHDRAW ---
    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) return alert("សូមបញ្ចូលចំនួនលុយ!");
        if (amount > (userProfile.balance || 0)) return alert("ទឹកប្រាក់មិនគ្រប់គ្រាន់!");
        if (amount < 0.50) return alert("ដកយ៉ាងតិច $0.50"); // Minimum withdraw
        if (!withdrawAccName || !withdrawAccNum) return alert("សូមបំពេញព័ត៌មានធនាគារ!");

        if (!window.confirm(`បញ្ជាក់ការដកលុយ $${amount} ទៅកាន់ ${withdrawBank}?`)) return;

        setProcessing(true);
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = getProfileDocRef(userId);
                const userDoc = await transaction.get(userRef);
                if ((userDoc.data().balance || 0) < amount) throw new Error("Balance low");

                // 1. Deduct Balance
                transaction.update(userRef, { balance: increment(-amount) });

                // 2. Create Withdraw Request
                const withdrawRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'));
                transaction.set(withdrawRef, {
                    userId: userId,
                    userName: userProfile.userName || 'Unknown',
                    bankName: withdrawBank,
                    accountName: withdrawAccName,
                    accountNumber: withdrawAccNum,
                    amount: amount,
                    status: 'pending',
                    date: serverTimestamp()
                });

                // 3. Add History
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(historyRef, {
                    title: `Request Withdraw (${withdrawBank})`,
                    amount: 0,
                    moneyEarned: -amount, // Show negative money
                    date: serverTimestamp(),
                    type: 'withdraw'
                });
            });
            alert("សំណើដកលុយត្រូវបានបញ្ជូន!");
            setWithdrawAmount('');
            setShowWithdraw(false);
        } catch (e) { alert("បរាជ័យ: " + e.message); } finally { setProcessing(false); }
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="MY BALANCE" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                {/* BALANCE CARDS */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-gradient-to-br from-purple-700 to-purple-900 text-center p-4 text-white border-purple-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1 bg-yellow-500/20 rounded-bl-lg"><Coins size={12} className="text-yellow-400"/></div>
                        <p className="text-xs opacity-70 mb-1">ពិន្ទុ (Coins)</p>
                        <span className="text-2xl font-bold text-yellow-400">{formatNumber(userProfile.points)}</span>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600 to-green-800 text-center p-4 text-white border-green-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1 bg-white/20 rounded-bl-lg"><DollarSign size={12} className="text-white"/></div>
                        <p className="text-xs opacity-70 mb-1">លុយ (Balance)</p>
                        <span className="text-2xl font-bold text-white">${(userProfile.balance || 0).toFixed(4)}</span>
                    </Card>
                </div>

                {/* EXCHANGE SECTION */}
                <Card className="p-4 border border-yellow-500/30 bg-purple-800/50">
                    <div className="flex justify-between items-center">
                         <div>
                             <h3 className="font-bold text-white text-sm">ប្តូរកាក់ជាលុយ (Exchange)</h3>
                             <p className="text-[10px] text-purple-300">អត្រា: {formatNumber(EXCHANGE_RATE)} Coins = $1.00</p>
                         </div>
                         <button onClick={() => setShowExchange(!showExchange)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center transition">
                            <RefreshCw size={14} className="mr-1"/> {showExchange ? 'បិទ' : 'ដូរឥឡូវ'}
                         </button>
                    </div>
                    {showExchange && (
                        <div className="mt-4 p-3 bg-purple-900 rounded-lg">
                            <label className="text-xs text-purple-200 mb-1 block">ចំនួនកាក់ដែលចង់ដូរ:</label>
                            <div className="flex space-x-2">
                                {/* FIXED: Added text-black and bg-white */}
                                <input 
                                    type="number" 
                                    value={exchangeAmount}
                                    onChange={(e) => setExchangeAmount(e.target.value)}
                                    placeholder="0"
                                    className="flex-1 p-2 rounded bg-white border border-purple-600 text-black font-bold text-sm focus:outline-none focus:border-yellow-500"
                                />
                                <button onClick={handleExchange} disabled={processing} className="px-4 bg-green-600 rounded text-white font-bold text-sm">OK</button>
                            </div>
                            {exchangeAmount > 0 && <p className="text-xs text-right mt-2 text-green-400">ទទួលបាន: <span className="font-bold">${(exchangeAmount / EXCHANGE_RATE).toFixed(4)}</span></p>}
                        </div>
                    )}
                </Card>

                {/* WITHDRAW SECTION (NEW) */}
                <Card className="p-4 border border-green-500/30 bg-purple-800/50">
                    <div className="flex justify-between items-center">
                         <div>
                             <h3 className="font-bold text-white text-sm">ដកលុយ (Withdraw)</h3>
                             <p className="text-[10px] text-purple-300">ABA / ACLEDA</p>
                         </div>
                         <button onClick={() => setShowWithdraw(!showWithdraw)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center transition">
                            <DollarSign size={14} className="mr-1"/> {showWithdraw ? 'បិទ' : 'ដកលុយ'}
                         </button>
                    </div>

                    {showWithdraw && (
                        <div className="mt-4 p-3 bg-purple-900 rounded-lg space-y-3">
                            <div>
                                <label className="text-xs text-purple-200 block mb-1">ជ្រើសរើសធនាគារ (Bank)</label>
                                <div className="flex space-x-2">
                                    {['ABA', 'ACLEDA'].map(b => (
                                        <button key={b} onClick={() => setWithdrawBank(b)} className={`flex-1 py-2 rounded text-sm font-bold ${withdrawBank === b ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{b}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-purple-200 block mb-1">ឈ្មោះគណនី (Account Name)</label>
                                <input value={withdrawAccName} onChange={e => setWithdrawAccName(e.target.value)} placeholder="Ex: SOK SAO" className="w-full p-2 rounded bg-white text-black font-bold text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-purple-200 block mb-1">លេខគណនី (Account Number)</label>
                                <input value={withdrawAccNum} onChange={e => setWithdrawAccNum(e.target.value)} type="number" placeholder="000 000 000" className="w-full p-2 rounded bg-white text-black font-bold text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-purple-200 block mb-1">ចំនួនទឹកប្រាក់ ($)</label>
                                <input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} type="number" placeholder="0.00" className="w-full p-2 rounded bg-white text-black font-bold text-sm" />
                            </div>
                            <button onClick={handleWithdraw} disabled={processing} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded mt-2">
                                {processing ? 'Processing...' : 'ស្នើសុំដកលុយ (REQUEST)'}
                            </button>
                        </div>
                    )}
                </Card>

                {/* HISTORY LIST */}
                <Card className="p-4">
                    <h3 className="font-bold text-white mb-3 border-b border-purple-600 pb-2 flex items-center"><Clock className="w-4 h-4 mr-2"/> ប្រវត្តិ (History)</h3>
                    {loading ? <div className="text-center text-purple-300 py-4">Loading...</div> : history.length > 0 ? (
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {history.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-purple-800 p-3 rounded-lg border border-purple-700">
                                    <div className="flex items-center">
                                        <div className={`p-2 rounded-full mr-3 ${item.type === 'withdraw' ? 'bg-red-900/50 text-red-400' : item.type === 'refund' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                            {item.type === 'withdraw' ? <LogOut size={16} /> : <RefreshCw size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-bold">{item.title || 'Unknown'}</p>
                                            <p className="text-[10px] text-purple-300 opacity-70">{item.date?.toDate ? item.date.toDate().toLocaleDateString() : 'Now'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {item.amount !== 0 && <span className={`font-bold block ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{item.amount > 0 ? '+' : ''}{formatNumber(item.amount)} Coins</span>}
                                        {item.moneyEarned && <span className={`text-[10px] font-bold block ${item.moneyEarned > 0 ? 'text-green-400' : 'text-red-400'}`}>{item.moneyEarned > 0 ? '+' : ''}${Number(item.moneyEarned).toFixed(4)}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="text-center text-purple-400 py-8 opacity-50">No History</div>}
                </Card>
            </main>
        </div>
    );
};

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
        case 'BALANCE_DETAILS': Content = <BalanceDetailsPage db={db} userId={userId} setPage={setPage} userProfile={userProfile} globalConfig={globalConfig} />; break;
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
                            
                            {/* COINS DISPLAY */}
                            <h1 className="text-4xl font-bold mt-2 mb-1 flex justify-center items-center gap-2">
                                {formatNumber(userProfile.points)} <Coins className="w-8 h-8 text-yellow-300" />
                            </h1>

                            {/* NEW CASH DISPLAY */}
                            <div className="flex justify-center items-center mb-4">
                                <div className="bg-black/20 backdrop-blur-sm px-4 py-1 rounded-full flex items-center border border-white/10">
                                    <span className="text-green-300 font-bold mr-1 text-lg">$</span>
                                    <span className="text-white font-bold text-lg tracking-wider">
                                        {(userProfile.balance || 0).toFixed(4)}
                                    </span>
                                </div>
                            </div>

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
