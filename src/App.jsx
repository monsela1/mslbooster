import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc,
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
    ArrowUpRight, ArrowDownLeft, Clock, Loader
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

// *** BAKONG CONFIG ***
const BAKONG_CONFIG = {
    merchantId: 'monsela@aclb', 
    merchantName: 'We4u App', // ឈ្មោះបង្ហាញពេលស្កេន
    merchantCity: 'Phnom Penh'
};

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
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0`; 
    }
    return null;
};

// --- CRC16 Calculation for KHQR (សំខាន់សម្រាប់ការបង្កើត QR) ---
const crc16 = (str) => {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
    }
    let hex = (crc & 0xFFFF).toString(16).toUpperCase();
    return hex.length === 3 ? "0" + hex : hex.length === 2 ? "00" + hex : hex.length === 1 ? "000" + hex : hex;
};

// --- Generate KHQR String Locally (Offline) ---
const generateLocalKHQR = (amount, currency = 'USD') => {
    // Tags
    // 00: Payload Format Indicator (01)
    // 01: Point of Initiation Method (11=Static, 12=Dynamic)
    // 29: Merchant Account Information (Bakong)
    // 52: Merchant Category Code (5999)
    // 53: Transaction Currency (840=USD, 116=KHR)
    // 54: Transaction Amount
    // 58: Country Code (KH)
    // 59: Merchant Name
    // 60: Merchant City
    // 63: CRC

    const merchantId = BAKONG_CONFIG.merchantId;
    const accountInfo = `0009KHQR@DEV10108${merchantId}`; // Simplified Bakong Account Info
    const tag29 = `29${accountInfo.length < 10 ? '0'+accountInfo.length : accountInfo.length}${accountInfo}`;
    
    const currencyCode = currency === 'USD' ? '840' : '116';
    const amountStr = parseFloat(amount).toFixed(2);
    
    let rawData = `000201010212${tag29}520459995303${currencyCode}54${amountStr.length < 10 ? '0'+amountStr.length : amountStr.length}${amountStr}5802KH59${BAKONG_CONFIG.merchantName.length < 10 ? '0'+BAKONG_CONFIG.merchantName.length : BAKONG_CONFIG.merchantName.length}${BAKONG_CONFIG.merchantName}60${BAKONG_CONFIG.merchantCity.length < 10 ? '0'+BAKONG_CONFIG.merchantCity.length : BAKONG_CONFIG.merchantCity.length}${BAKONG_CONFIG.merchantCity}6304`;
    
    const checksum = crc16(rawData);
    return rawData + checksum;
};

// Firestore Paths
const getProfileDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'profile', 'user_data') : null;
const getCampaignsCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'campaigns') : null;
const getReferralCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'referrals') : null;
const getDailyStatusDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'daily_status', getTodayDateKey()) : null;
const getGlobalConfigDocRef = () => db ? doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings') : null;
const getShortCodeDocRef = (shortId) => db && shortId ? doc(db, 'artifacts', appId, 'public', 'data', 'short_codes', shortId) : null;
const getHistoryCollectionRef = (userId) => db && userId ? collection(db, 'artifacts', appId, 'users', userId, 'history') : null;

// Default Config (USD)
const defaultGlobalConfig = {
    dailyCheckinReward: 200,
    referrerReward: 1000,
    referredBonus: 500,
    adsReward: 30,
    maxDailyAds: 15,
    adsSettings: { bannerId: "ca-app-pub-xxx", interstitialId: "ca-app-pub-xxx", isEnabled: true },
    coinPackages: [
        { id: 1, coins: 5000, price: 1.00, priceLabel: '$1.00', color: 'bg-green-500' },
        { id: 2, coins: 15000, price: 3.00, priceLabel: '$3.00', color: 'bg-blue-500' },
        { id: 3, coins: 50000, price: 10.00, priceLabel: '$10.00', color: 'bg-purple-500' },
        { id: 4, coins: 150000, price: 25.00, priceLabel: '$25.00', color: 'bg-red-500' },
    ]
};

// --- 4. SHARED UI COMPONENTS ---
const Loading = () => <div className="flex justify-center items-center h-screen bg-purple-900"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400"></div></div>;
const IconButton = ({ icon: Icon, title, onClick, iconColor = 'text-purple-300', textColor = 'text-white', disabled = false }) => <button onClick={!disabled ? onClick : undefined} className={`flex flex-col items-center justify-start p-2 rounded-xl transition transform w-full h-32 border ${disabled ? 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-70' : 'bg-purple-800 shadow-lg border-purple-700 hover:scale-105 active:scale-95'}`}><div className={`p-3 rounded-xl ${disabled ? 'bg-gray-700' : 'bg-purple-900 shadow-inner'}`}><Icon className={`w-8 h-8 ${disabled ? 'text-gray-500' : iconColor}`} /></div><span className={`mt-2 text-xs font-bold text-center ${disabled ? 'text-gray-500' : textColor} break-words leading-tight`}>{title}</span></button>;
const Card = ({ children, className = '' }) => <div className={`bg-purple-800 rounded-xl shadow-xl border border-purple-700 text-white ${className}`}>{children}</div>;
const Header = ({ title, onBack, rightContent, className = '' }) => <header className={`flex items-center justify-between p-4 bg-purple-950 shadow-md text-white fixed top-0 w-full z-20 border-b border-purple-800 ${className}`}><div className="flex items-center">{onBack && (<button onClick={onBack} className="p-1 mr-2 rounded-full hover:bg-purple-800 transition"><ChevronLeft className="w-6 h-6" /></button>)}<h1 className="text-xl font-bold">{title}</h1></div>{rightContent}</header>;
const InputField = (props) => <input {...props} className={`w-full p-3 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-400 focus:outline-none focus:border-yellow-400 ${props.className || ''}`}/>;

// --- NEW COMPONENT: BAKONG KHQR PAYMENT MODAL (LOCAL GENERATION) ---
const BakongPaymentModal = ({ pkg, onClose, onSuccess }) => {
    const [qrString, setQrString] = useState('');
    const [status, setStatus] = useState('ready'); 

    useEffect(() => {
        // Generate KHQR locally (No API Call needed)
        try {
            const qr = generateLocalKHQR(pkg.price, 'USD');
            setQrString(qr);
        } catch (e) {
            console.error("QR Error", e);
        }
    }, [pkg]);

    const handleVerifyManually = () => {
        // Since we are offline/manual, we assume user paid. 
        // Ideally, you check SMS or App notification.
        if(window.confirm("តើអ្នកបានបង់ប្រាក់រួចរាល់ហើយឬនៅ?")) {
            setStatus('success');
            setTimeout(() => onSuccess(pkg), 1000);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-500"><XCircle/></button>
                
                <h3 className="text-xl font-bold text-purple-900 mb-2">KHQR បង់ប្រាក់ ($)</h3>
                <p className="text-gray-600 mb-4">ស្កេនដើម្បីទិញ {formatNumber(pkg.coins)} Coins</p>
                
                <div className="flex flex-col items-center justify-center min-h-[250px]">
                    {qrString ? (
                        <div className="space-y-3">
                            <div className="p-2 border-4 border-purple-600 rounded-lg inline-block relative bg-white">
                                {/* Display Real Scannable QR */}
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrString)}`}
                                    alt="KHQR Code"
                                    className="w-56 h-56"
                                />
                            </div>
                            <p className="text-xl font-bold text-green-600">${pkg.price.toFixed(2)}</p>
                            
                            <div className="bg-yellow-100 text-yellow-800 text-xs p-2 rounded">
                                សូមស្កេនបង់ប្រាក់តាមរយៈ App ធនាគាររបស់អ្នក (ABA, ACLEDA, BAKONG...)
                            </div>

                            {status === 'success' ? (
                                <div className="text-green-600 font-bold flex items-center justify-center"><CheckCircle className="mr-2"/> ជោគជ័យ!</div>
                            ) : (
                                <button 
                                    onClick={handleVerifyManually}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg animate-pulse"
                                >
                                    ខ្ញុំបានបង់ប្រាក់រួចរាល់ (I Paid)
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-red-500">Error creating QR</p>
                    )}
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
    const handleAdsChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, adsSettings: { ...prev.adsSettings, [name]: value } }));
    };
    const handlePackageChange = (index, field, value) => {
        const newPackages = config.coinPackages ? [...config.coinPackages] : [];
        if (newPackages[index]) {
            newPackages[index][field] = field === 'price' ? parseFloat(value) : (field === 'coins' ? parseInt(value) : value);
            setConfig(prev => ({ ...prev, coinPackages: newPackages }));
        }
    };

    return (
        <div className="space-y-4 pb-10">
            <Card className="p-4 border-l-4 border-yellow-400">
                <h3 className="font-bold text-lg mb-3 text-yellow-400 flex items-center"><Coins className="w-5 h-5 mr-2"/> ការកំណត់រង្វាន់</h3>
                <div className="grid grid-cols-1 gap-3">
                    <div><label className="text-xs font-bold text-purple-300">Daily Check-in Points</label><InputField name="dailyCheckinReward" type="number" value={config.dailyCheckinReward || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Referral Reward Points</label><InputField name="referrerReward" type="number" value={config.referrerReward || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Referred User Bonus</label><InputField name="referredBonus" type="number" value={config.referredBonus || 0} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Watch Ads Reward</label><InputField name="adsReward" type="number" value={config.adsReward || 0} onChange={handleChange} /></div>
                </div>
            </Card>
            <Card className="p-4 border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-3 text-green-400 flex items-center"><ShoppingCart className="w-5 h-5 mr-2"/> កំណត់កញ្ចប់កាក់ (Sell Coins)</h3>
                <div className="space-y-3">
                    {config.coinPackages?.map((pkg, idx) => (
                        <div key={pkg.id || idx} className="flex space-x-2 items-center bg-purple-900 p-2 rounded">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">{idx + 1}</div>
                            <div className="flex-1"><label className="text-xs text-purple-300">ចំនួនកាក់</label><InputField type="number" value={pkg.coins} onChange={(e) => handlePackageChange(idx, 'coins', e.target.value)} /></div>
                            <div className="flex-1"><label className="text-xs text-purple-300">តម្លៃ ($ USD)</label><InputField type="number" step="0.01" value={pkg.price} onChange={(e) => handlePackageChange(idx, 'price', e.target.value)} /></div>
                            <div className="flex-1"><label className="text-xs text-purple-300">Label</label><InputField type="text" value={pkg.priceLabel} onChange={(e) => handlePackageChange(idx, 'priceLabel', e.target.value)} /></div>
                        </div>
                    )) || <p className="text-red-300 text-sm">No packages found.</p>}
                </div>
            </Card>
             <button onClick={onSave} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex justify-center items-center transition"><Save className="w-5 h-5 mr-2"/> រក្សាទុកការកំណត់ (SAVE ALL)</button>
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
                const profileSnap = await getDoc(getProfileDocRef(fullUserId));
                return profileSnap.exists() ? { ...profileSnap.data(), uid: fullUserId } : null;
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
                if(profile.exists()) setFoundUser({ uid, ...profile.data() });
            } else { showNotification('User not found', 'error'); setFoundUser(null); }
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
    return (
        <div className='space-y-4 pb-10'>
            <Card className="p-4">
                <div className="flex space-x-2 mb-4">
                    <InputField value={searchId} onChange={e => setSearchId(e.target.value.toUpperCase())} placeholder="Enter ID (e.g. A1B2C3)" className="uppercase font-mono" maxLength={6}/>
                    <button onClick={handleSearch} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Search/></button>
                </div>
                {foundUser && (
                    <div className="bg-purple-900 p-4 rounded-lg border border-purple-600">
                        <p className="font-bold text-lg text-white">{foundUser.userName}</p>
                        <p className="text-purple-300 text-sm mb-2">Points: <span className="font-bold text-yellow-400">{formatNumber(foundUser.points)}</span></p>
                        <div className="flex items-center space-x-2 mt-4">
                            <button onClick={() => setPointsToAdd(p => p - 100)} className="p-2 bg-red-600 rounded text-white"><MinusCircle size={20}/></button>
                            <InputField type="number" value={pointsToAdd} onChange={e => setPointsToAdd(e.target.value)} className="text-center font-bold"/>
                            <button onClick={() => setPointsToAdd(p => p + 100)} className="p-2 bg-green-600 rounded text-white"><PlusCircle size={20}/></button>
                        </div>
                        <button onClick={handleUpdatePoints} className="w-full mt-3 bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700">Update</button>
                    </div>
                )}
            </Card>
        </div>
    );
};

const AdminDashboardPage = ({ db, setPage, showNotification }) => {
    const [activeTab, setActiveTab] = useState('SETTINGS');
    const [config, setConfig] = useState(null);
    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        const fetchConfig = async () => {
            const docSnap = await getDoc(getGlobalConfigDocRef());
            if (docSnap.exists()) {
                setConfig({ ...defaultGlobalConfig, ...docSnap.data() });
            } else {
                setConfig(defaultGlobalConfig);
            }
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
        if(window.confirm('Delete?')) {
             try { await updateDoc(doc(getCampaignsCollectionRef(), id), { remaining: 0, isActive: false }); } catch(e){}
        }
    };

    if (!config) return <Loading />;

    return (
        <div className="min-h-screen bg-purple-950 pb-16 pt-20">
            <Header title="ADMIN PANEL" onBack={() => setPage('DASHBOARD')} className="bg-purple-900" />
            <main className="p-4">
                <div className="flex space-x-1 mb-4 bg-purple-800 p-1 rounded-lg">
                    {['SETTINGS', 'USERS', 'CAMPAIGNS'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-lg font-bold text-xs ${activeTab === tab ? 'bg-teal-600' : 'text-purple-300'}`}>{tab}</button>
                    ))}
                </div>
                {activeTab === 'SETTINGS' && <AdminSettingsTab config={config} setConfig={setConfig} onSave={handleSaveConfig} />}
                {activeTab === 'USERS' && <AdminUserManagerTab db={db} showNotification={showNotification} />}
                {activeTab === 'CAMPAIGNS' && (
                    <div className="space-y-2 pb-10">
                        {campaigns.map(c => (
                            <div key={c.id} className="bg-purple-800 p-3 rounded flex justify-between">
                                <div className='w-2/3 truncate text-white font-bold'>{c.link} <br/><span className='text-xs text-gray-400'>Rem: {c.remaining}</span></div>
                                <button onClick={() => handleDeleteCampaign(c.id)}><Trash2 size={18} className='text-red-400'/></button>
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
                transaction.update(referrerRef, { points: increment(globalConfig.referrerReward), totalEarned: increment(globalConfig.referrerReward) });
                const referrerHistoryRef = doc(collection(db, 'artifacts', appId, 'users', referrerId, 'history'));
                transaction.set(referrerHistoryRef, { title: 'Referral Reward', amount: globalConfig.referrerReward, date: serverTimestamp(), type: 'referral' });

                const bonus = globalConfig.referredBonus || 500;
                transaction.update(userRef, { referredBy: code, points: increment(bonus), totalEarned: increment(bonus) });
                const myHistoryRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                transaction.set(myHistoryRef, { title: 'Entered Code Bonus', amount: bonus, date: serverTimestamp(), type: 'referral_code' });

                const newReferralRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'referrals'));
                transaction.set(newReferralRef, { referrerId: referrerId, referredUserId: userId, referredName: userProfile.userName || 'Unknown', reward: globalConfig.referrerReward, timestamp: serverTimestamp() });
            });
            showNotification('ជោគជ័យ!', 'success'); setInputCode('');
        } catch (e) { showNotification(e.message, 'error'); }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="ណែនាំមិត្ត" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <Card className="p-6 text-center bg-purple-800 border-2 border-yellow-500/50">
                    <h3 className="font-bold text-white text-lg">កូដណែនាំរបស់អ្នក</h3>
                    <div className="text-4xl font-mono font-extrabold text-yellow-400 my-4 tracking-widest bg-purple-900 p-2 rounded-lg shadow-inner">{shortId}</div>
                    <p className="text-sm text-purple-200 font-medium">ទទួលបាន <span className='text-green-400 font-bold'>{formatNumber(globalConfig.referrerReward)}</span> Points</p>
                    <button onClick={() => {navigator.clipboard.writeText(shortId); showNotification('Copied!', 'success')}} className="mt-5 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-full font-bold mx-auto block">Copy</button>
                </Card>
                <Card className="p-4 border border-teal-500/30 bg-gradient-to-br from-purple-800 to-purple-900">
                    <h3 className="font-bold text-white mb-2">ដាក់កូដអ្នកណែនាំ</h3>
                    {userProfile.referredBy ? (
                        <div className="text-center text-green-400">Ref: {userProfile.referredBy} (Success)</div>
                    ) : (
                        <div className="flex space-x-2">
                            <input value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={6} className="flex-1 p-2 bg-purple-950 border border-purple-600 rounded text-white text-center uppercase" />
                            <button onClick={handleSubmitCode} className="px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold">OK</button>
                        </div>
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
    const [previewUrl, setPreviewUrl] = useState(null);
    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('userId', '==', userId));
        return onSnapshot(q, (snap) => setUserCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)));
    }, [db, userId]);
    const handleCheckLink = (e) => {
        e.preventDefault();
        if(!link) return;
        if (type === 'view' || type === 'sub') {
            const embed = getEmbedUrl(link);
            if(!embed) return showNotification('Invalid YouTube Link', 'error');
            setPreviewUrl(embed);
        }
        setIsLinkVerified(true);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        const cost = (type === 'sub' ? 50 : 1) * (type === 'sub' ? count : count * time);
        if (cost > userProfile.points) return showNotification('Not enough points', 'error');
        setIsSubmitting(true);
        try {
            await runTransaction(db, async (tx) => {
                const pRef = getProfileDocRef(userId);
                tx.update(pRef, { points: increment(-cost) });
                const newRef = doc(getCampaignsCollectionRef());
                tx.set(newRef, { userId, type, link, costPerUnit: type === 'sub' ? 50 : 1, requiredDuration: type === 'sub' ? 60 : time, initialCount: parseInt(count), remaining: parseInt(count), totalCost: cost, createdAt: serverTimestamp(), isActive: true });
                const hRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                tx.set(hRef, { title: `Create Campaign`, amount: -cost, date: serverTimestamp(), type: 'campaign' });
            });
            showNotification('Created!', 'success'); setLink(''); setIsLinkVerified(false);
        } catch(e) { showNotification(e.message, 'error'); }
        setIsSubmitting(false);
    };
    return (
        <div className="min-h-screen bg-[#0f172a] pb-16 pt-20">
             <Header title="MY CAMPAIGNS" onBack={() => setPage('DASHBOARD')} />
             <div className="px-4">
                <div className="bg-[#0f172a] p-2 mb-4">
                     <div className="flex space-x-2 mb-4">
                        {['view', 'sub', 'website'].map(t => <button key={t} onClick={() => {setType(t); setIsLinkVerified(false);}} className={`flex-1 py-2 rounded font-bold text-xs ${type===t?'bg-[#4c1d95] text-white':'bg-gray-800 text-gray-400'}`}>{t.toUpperCase()}</button>)}
                    </div>
                    <form onSubmit={isLinkVerified ? handleSubmit : handleCheckLink} className="space-y-3">
                        <input value={link} onChange={e => {setLink(e.target.value); setIsLinkVerified(false);}} placeholder="Link..." className="w-full p-3 rounded bg-white text-black" required disabled={isLinkVerified}/>
                        {isLinkVerified && (
                            <>
                                <div className='flex justify-between text-white text-sm'><label>Count</label><input type="number" value={count} onChange={e=>setCount(e.target.value)} className='w-20 text-black text-center rounded'/></div>
                                {type!=='sub' && <div className='flex justify-between text-white text-sm'><label>Seconds</label><input type="number" value={time} onChange={e=>setTime(e.target.value)} className='w-20 text-black text-center rounded'/></div>}
                                <button type="submit" disabled={isSubmitting} className="w-full bg-yellow-600 text-white py-3 rounded font-bold mt-2">{isSubmitting ? '...' : `PAY ${(type === 'sub' ? 50 : 1) * (type === 'sub' ? count : count * time)}`}</button>
                            </>
                        )}
                        {!isLinkVerified && <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">CHECK LINK</button>}
                    </form>
                </div>
                <div className="space-y-2">
                    {userCampaigns.map(c => (
                        <div key={c.id} className="bg-gray-800 p-3 rounded border-l-4 border-teal-500 text-white text-xs">
                            <div className='truncate font-bold'>{c.link}</div>
                            <div className='flex justify-between mt-1'><span>{c.type.toUpperCase()}</span><span>Rem: {c.remaining}</span></div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
};

const EarnPage = ({ db, userId, type, setPage, showNotification }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [current, setCurrent] = useState(null);
    const [timer, setTimer] = useState(0);
    const [claimed, setClaimed] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('type', '==', type), limit(50));
        const unsub = onSnapshot(q, (snap) => {
            if(!isMounted.current) return;
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.userId !== userId && c.remaining > 0 && c.isActive !== false);
            setCampaigns(list);
            if (!current && list.length > 0) setCurrent(list[0]);
        });
        return () => unsub();
    }, [db, userId, type]);

    useEffect(() => { if (current) { setTimer(current.requiredDuration || 30); setClaimed(false); } }, [current]);
    useEffect(() => { 
        let interval; 
        if (timer > 0 && !claimed) interval = setInterval(() => setTimer(t => t - 1), 1000);
        return () => clearInterval(interval); 
    }, [timer, claimed]);

    const handleClaim = async () => {
        if (claimed || !current) return;
        setClaimed(true);
        try {
            await runTransaction(db, async (tx) => {
                const campRef = doc(getCampaignsCollectionRef(), current.id);
                const campDoc = await tx.get(campRef);
                if (!campDoc.exists() || campDoc.data().remaining <= 0) throw new Error("Ended");
                tx.update(getProfileDocRef(userId), { points: increment(current.requiredDuration || 50), totalEarned: increment(current.requiredDuration || 50) });
                tx.update(campRef, { remaining: increment(-1) });
                const hRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                tx.set(hRef, { title: 'Earned Points', amount: current.requiredDuration || 50, date: serverTimestamp(), type: 'earn' });
            });
            if(isMounted.current) showNotification('Points Added!', 'success');
        } catch(e) {}
    };

    const embedSrc = current ? (type === 'website' ? current.link : getEmbedUrl(current.link)) : null;

    return (
        <div className="h-screen bg-black flex flex-col">
            <Header title="EARN" onBack={() => setPage('DASHBOARD')} className="relative" />
            <div className="flex-1 relative">
                {current && embedSrc ? (
                    <iframe src={embedSrc} className="w-full h-full" frameBorder="0" allowFullScreen sandbox={type==='website'?"allow-scripts allow-same-origin":undefined}/>
                ) : <div className='text-white flex items-center justify-center h-full'>Loading...</div>}
            </div>
            <div className="bg-white p-4 z-20">
                {current ? (
                    <div className="flex justify-between items-center">
                         <div className="font-bold text-yellow-600">{current.requiredDuration} Points</div>
                         <button onClick={handleClaim} disabled={timer > 0 || claimed} className={`px-6 py-2 rounded font-bold text-white ${timer>0||claimed?'bg-gray-400':'bg-green-600'}`}>{claimed?'CLAIMED':timer>0?timer+'s':'CLAIM'}</button>
                         <button onClick={() => { const next = campaigns.filter(c=>c.id!==current.id)[0]; setCurrent(next||null); }} className="bg-yellow-500 text-white px-4 py-2 rounded">SKIP</button>
                    </div>
                ) : <p className='text-center'>No Data</p>}
            </div>
        </div>
    );
};

const BalanceDetailsPage = ({ db, userId, setPage, userProfile }) => {
    const [history, setHistory] = useState([]);
    useEffect(() => {
        if (!db || !userId) return;
        const q = query(getHistoryCollectionRef(userId), orderBy('date', 'desc'), limit(30));
        const unsub = onSnapshot(q, (snap) => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [db, userId]);
    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="MY BALANCE" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Card className="text-center p-4 text-white bg-purple-800"><p className="text-xs">Current</p><p className="text-xl font-bold text-yellow-400">{formatNumber(userProfile.points)}</p></Card>
                    <Card className="text-center p-4 text-white bg-teal-800"><p className="text-xs">Total Earned</p><p className="text-xl font-bold">{formatNumber(userProfile.totalEarned || 0)}</p></Card>
                </div>
                <Card className="p-4">
                    <h3 className="font-bold text-white mb-3 border-b border-purple-600 pb-2">History</h3>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {history.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-purple-800 p-2 rounded border border-purple-700">
                                <div><p className="text-white text-sm">{item.title}</p><p className="text-[10px] text-purple-300">{item.date?.toDate().toLocaleDateString()}</p></div>
                                <span className={`font-bold ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{item.amount > 0 ? '+' : ''}{formatNumber(item.amount)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </main>
        </div>
    );
};

const WatchAdsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const [timer, setTimer] = useState(15);
    useEffect(() => { if(timer > 0) setTimeout(()=>setTimer(t=>t-1), 1000); }, [timer]);
    const claim = async () => {
         await runTransaction(db, async(tx)=>{
             tx.update(getProfileDocRef(userId), { points: increment(globalConfig.adsReward), totalEarned: increment(globalConfig.adsReward) });
             const hRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
             tx.set(hRef, { title: 'Watched Ad', amount: globalConfig.adsReward, date: serverTimestamp(), type: 'ads' });
         });
         showNotification('Claimed!', 'success'); setPage('DASHBOARD');
    };
    return <div className="h-screen bg-black flex items-center justify-center text-white flex-col"><div className="mb-4 text-2xl">ADS PLAYING...</div>{timer>0?timer+'s':<button onClick={claim} className="bg-green-600 px-6 py-3 rounded font-bold">CLAIM</button>}</div>
};

// --- 6. USER PAGES ---
const BuyCoinsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const [selectedPkg, setSelectedPkg] = useState(null);

    const handlePurchaseSuccess = async (pkg) => {
        try {
            setSelectedPkg(null); // Close Modal
            await runTransaction(db, async (tx) => { 
                tx.update(getProfileDocRef(userId), { 
                    points: increment(pkg.coins),
                    totalEarned: increment(pkg.coins)
                }); 
                const historyRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history'));
                tx.set(historyRef, {
                    title: 'Purchased Coins (KHQR)',
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
                {globalConfig.coinPackages.map((pkg) => (
                    <button key={pkg.id} onClick={() => setSelectedPkg(pkg)} className={`w-full flex items-center justify-between p-4 rounded-xl shadow-lg text-white transform active:scale-95 transition ${pkg.color}`}>
                        <div className="flex items-center space-x-3">
                            <div className="bg-white bg-opacity-20 p-3 rounded-full"><Coins className="w-6 h-6 text-yellow-100" /></div>
                            <div className="text-left"><p className="text-xl font-bold">{formatNumber(pkg.coins)} Coins</p><p className="text-sm opacity-80">កញ្ចប់ពិន្ទុ</p></div>
                        </div>
                        <div className="bg-white text-gray-800 font-bold px-4 py-2 rounded-lg">{pkg.priceLabel || '$'+pkg.price.toFixed(2)}</div>
                    </button>
                ))}
            </main>

            {/* Payment Modal */}
            {selectedPkg && (
                <BakongPaymentModal 
                    pkg={selectedPkg} 
                    onClose={() => setSelectedPkg(null)} 
                    onSuccess={handlePurchaseSuccess} 
                />
            )}
        </div>
    );
};

// --- 7. AUTH COMPONENT (Same) ---
const AuthForm = ({ onSubmit, btnText, isRegister = false }) => {
    const [email, setEmail] = useState(''); const [pass, setPass] = useState(''); const [username, setUsername] = useState(''); const [refCode, setRefCode] = useState('');
    return (
        <form onSubmit={(e)=>{e.preventDefault(); onSubmit(email, pass, username, refCode)}} className="space-y-4">
            {isRegister && <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} className="w-full p-3 rounded" required/>}
            <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-3 rounded" required/>
            <input placeholder="Password" type="password" value={pass} onChange={e=>setPass(e.target.value)} className="w-full p-3 rounded" required/>
            {isRegister && <input placeholder="Ref Code (Optional)" value={refCode} onChange={e=>setRefCode(e.target.value)} className="w-full p-3 rounded"/>}
            <button className="w-full bg-teal-500 text-white p-3 rounded font-bold">{btnText}</button>
        </form>
    );
};

// --- 8. MAIN APP COMPONENT ---
const App = () => {
    const [page, setPage] = useState('DASHBOARD');
    const [userId, setUserId] = useState(null);
    const [userProfile, setUserProfile] = useState({});
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [notification, setNotification] = useState(null);
    const [authPage, setAuthPage] = useState('LOGIN');
    const [globalConfig, setGlobalConfig] = useState(defaultGlobalConfig);
    const ADMIN_EMAILS = ["admin@gmail.com"]; 
    const isAdmin = userProfile.email && ADMIN_EMAILS.includes(userProfile.email);

    const showNotification = useCallback((msg, type = 'info') => { setNotification({ message: msg, type }); setTimeout(() => setNotification(null), 3000); }, []);
    useEffect(() => { return onAuthStateChanged(auth, (user) => { if (user) setUserId(user.uid); else { setUserId(null); setPage('DASHBOARD'); } setIsAuthReady(true); }); }, []);
    useEffect(() => { if (db && userId) return onSnapshot(getProfileDocRef(userId), (doc) => { if (doc.exists()) setUserProfile({ ...doc.data(), id: userId }); }); }, [db, userId]);
    useEffect(() => { if (db) return onSnapshot(getGlobalConfigDocRef(), (doc) => { if (doc.exists()) setGlobalConfig({ ...defaultGlobalConfig, ...doc.data() }); }); }, [db]);

    const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { showNotification(e.code, 'error'); } };
    const handleRegister = async (email, password, username, refCode) => {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;
            const shortId = getShortId(uid);
            await setDoc(getProfileDocRef(uid), { userId: uid, email, userName: username || `User_${shortId}`, points: 5000, totalEarned: 5000, shortId, createdAt: serverTimestamp() });
            await setDoc(getShortCodeDocRef(shortId), { fullUserId: uid, shortId });
        } catch (e) { showNotification(e.code, 'error'); }
    };
    const handleDailyCheckin = async () => {
        try { await runTransaction(db, async (tx) => { tx.update(getProfileDocRef(userId), { points: increment(globalConfig.dailyCheckinReward), totalEarned: increment(globalConfig.dailyCheckinReward) }); tx.set(getDailyStatusDocRef(userId), { checkinDone: true }, { merge: true }); const hRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'history')); tx.set(hRef, { title: 'Daily Check-in', amount: globalConfig.dailyCheckinReward, date: serverTimestamp(), type: 'checkin' }); }); showNotification('Success!', 'success'); } catch(e){}
    };

    if (!isAuthReady) return <Loading />;
    if (!userId) return (
        <div className="min-h-screen bg-purple-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-6">
                <h2 className="text-2xl font-bold text-center mb-6 text-white">{authPage}</h2>
                <AuthForm onSubmit={authPage === 'LOGIN' ? handleLogin : handleRegister} btnText={authPage} isRegister={authPage === 'REGISTER'}/>
                <button onClick={() => setAuthPage(authPage === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full mt-4 text-teal-400">Switch to {authPage === 'LOGIN' ? 'Register' : 'Login'}</button>
            </Card>
            {notification && <div className="fixed top-4 bg-red-500 text-white p-2 rounded">{notification.message}</div>}
        </div>
    );

    let Content;
    switch (page) {
        case 'EARN_POINTS': Content = <EarnPage db={db} userId={userId} type="view" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_WEBSITE': Content = <EarnPage db={db} userId={userId} type="website" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_SUBSCRIPTION': Content = <EarnPage db={db} userId={userId} type="sub" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_CAMPAIGNS': Content = <MyCampaignsPage db={db} userId={userId} userProfile={userProfile} setPage={setPage} showNotification={showNotification} />; break;
        case 'REFERRAL_PAGE': Content = <ReferralPage db={db} userId={userId} userProfile={userProfile} showNotification={showNotification} setPage={setPage} globalConfig={globalConfig} />; break;
        case 'BUY_COINS': Content = <BuyCoinsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'BALANCE_DETAILS': Content = <BalanceDetailsPage db={db} userId={userId} setPage={setPage} userProfile={userProfile} />; break;
        case 'WATCH_ADS': Content = <WatchAdsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_PLAN': Content = <MyPlanPage setPage={setPage} />; break;
        case 'ADMIN_DASHBOARD': Content = <AdminDashboardPage db={db} setPage={setPage} showNotification={showNotification} />; break;
        default:
            Content = (
                <div className="min-h-screen bg-purple-900 pb-16 pt-20">
                    <Header title="We4u App" className="z-20" rightContent={<div className="flex space-x-2">{isAdmin && <button onClick={() => setPage('ADMIN_DASHBOARD')}><Settings className='text-white'/></button>}<button onClick={() => signOut(auth)}><LogOut className='text-white'/></button></div>}/>
                    <div className="px-4 mb-6"><div className="bg-gradient-to-r from-teal-500 to-teal-700 rounded-xl p-6 text-white shadow-lg text-center relative overflow-hidden border border-teal-400/30"><p className="text-sm opacity-80">Balance</p><h1 className="text-4xl font-bold my-2 flex justify-center items-center gap-2">{formatNumber(userProfile.points)} <Coins className="w-6 h-6 text-yellow-300" /></h1><p className="text-xs bg-white bg-opacity-20 inline-block px-3 py-1 rounded-full">ID: {userProfile.shortId}</p></div></div>
                    <div className="px-4"><Card className="p-4 grid grid-cols-3 gap-3"><IconButton icon={CalendarCheck} title="DAILY TASK" onClick={handleDailyCheckin} disabled={userProfile.dailyCheckin}/><IconButton icon={UserCheck} title="SUBSCRIBE" onClick={() => setPage('EXPLORE_SUBSCRIPTION')} iconColor="text-pink-400" /><IconButton icon={Film} title="PLAY VIDEO" onClick={() => setPage('EARN_POINTS')} iconColor="text-red-400" /><IconButton icon={Wallet} title="MY BALANCE" onClick={() => setPage('BALANCE_DETAILS')} iconColor="text-orange-400" /><IconButton icon={ShoppingCart} title="BUY COINS" onClick={() => setPage('BUY_COINS')} iconColor="text-purple-400" /><IconButton icon={Target} title="CAMPAIGNS" onClick={() => setPage('MY_CAMPAIGNS')} iconColor="text-teal-400" /><IconButton icon={UserPlus} title="REFERRAL" onClick={() => setPage('REFERRAL_PAGE')} iconColor="text-blue-400" /><IconButton icon={Globe} title="WEBSITE" onClick={() => setPage('EXPLORE_WEBSITE')} iconColor="text-indigo-400" /><IconButton icon={MonitorPlay} title="ADS" onClick={() => setPage('WATCH_ADS')} iconColor="text-pink-400" /></Card></div>
                </div>
            );
    }

    return (
        <div className="font-sans bg-purple-900 min-h-screen relative">
            {Content}
            {notification && <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-50 text-white font-bold ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{notification.message}</div>}
        </div>
    );
};

export default App;
