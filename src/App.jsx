import React, { useState, useEffect, useCallback } from 'react';
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
    runTransaction, increment
} from 'firebase/firestore';
import {
    Users, Coins, Video, Link, Globe, MonitorPlay, Zap,
    UserPlus, ChevronLeft, BookOpen, ShoppingCart,
    CalendarCheck, Target, Wallet, Film,
    DollarSign, LogOut, Mail, Lock, CheckSquare, Edit, Trash2, Settings
} from 'lucide-react';

// --- Configuration ---
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

// --- Firebase Initialization ---
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

// Helper Functions
const getTodayDateKey = () => new Date().toISOString().split('T')[0];
const getShortId = (id) => id?.substring(0, 6).toUpperCase() || '------';
const formatNumber = (num) => num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';

// Firestore Paths
const getProfileDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'profile', 'user_data') : null;
const getCampaignsCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'campaigns') : null;
const getReferralCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'referrals') : null;
const getDailyStatusDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'daily_status', getTodayDateKey()) : null;
const getGlobalConfigDocRef = () => db ? doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings') : null;
const getShortCodeDocRef = (shortId) => db && shortId ? doc(db, 'artifacts', appId, 'public', 'data', 'short_codes', shortId) : null;

const defaultGlobalConfig = {
    dailyCheckinReward: 200,
    referrerReward: 1000,
    coinPackages: [
        { id: 1, coins: 5000, price: '5,000 Riel', color: 'bg-green-500' },
        { id: 2, coins: 15000, price: '15,000 Riel', color: 'bg-blue-500' },
        { id: 3, coins: 50000, price: '50,000 Riel', color: 'bg-purple-500' },
        { id: 4, coins: 150000, price: '150,000 Riel', color: 'bg-red-500' },
    ]
};

// --- UI Components ---
const Loading = () => (
    <div className="flex justify-center items-center h-screen bg-blue-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500"></div>
        <span className="ml-3 text-white text-lg font-semibold">កំពុងផ្ទុក...</span>
    </div>
);

const IconButton = ({ icon: Icon, title, onClick, iconColor = 'text-gray-600', textColor = 'text-gray-800' }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-start p-2 rounded-xl transition transform hover:scale-105 active:scale-95 w-full h-32 bg-white shadow-md border border-gray-200">
        <div className={`p-3 rounded-xl bg-gray-100 shadow-inner`}>
            <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        <span className={`mt-2 text-xs font-bold text-center ${textColor} break-words leading-tight`}>{title}</span>
    </button>
);

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-xl ${className}`}>{children}</div>
);

const Header = ({ title, onBack, rightContent, className = '' }) => (
    <header className={`flex items-center justify-between p-4 bg-teal-700 shadow-md text-white fixed top-0 w-full z-20 ${className}`}>
        <div className="flex items-center">
            {onBack && (
                <button onClick={onBack} className="p-1 mr-2 rounded-full hover:bg-teal-600 transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            <h1 className="text-xl font-bold">{title}</h1>
        </div>
        {rightContent}
    </header>
);

// --- PAGE COMPONENTS ---

// 1. Campaigns Page
const MyCampaignsPage = ({ db, userId, userProfile, setPage, showNotification }) => {
    const [type, setType] = useState('view');
    const [link, setLink] = useState('');
    const [count, setCount] = useState(10);
    const [time, setTime] = useState(60);
    const [userCampaigns, setUserCampaigns] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, (snap) => {
            setUserCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
        });
        return () => unsubscribe();
    }, [db, userId]);

    const calculateCost = useCallback(() => {
        const c = parseInt(count) || 0;
        const t = parseInt(time) || 0;
        return type === 'sub' ? c * 50 : c * t * 1;
    }, [type, count, time]);

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
                    userId, type, link: link.trim(),
                    costPerUnit: type === 'sub' ? 50 : 1,
                    requiredDuration: type === 'sub' ? 60 : (parseInt(time) || 60),
                    initialCount: parseInt(count),
                    remaining: parseInt(count),
                    totalCost: cost,
                    createdAt: serverTimestamp(),
                    isActive: true
                });
            });
            showNotification('ដាក់យុទ្ធនាការជោគជ័យ!', 'success');
            setLink('');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-blue-900 pb-16 pt-20">
            <Header title="យុទ្ធនាការខ្ញុំ" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <Card className="p-4">
                    <h2 className="font-bold text-lg mb-4 text-gray-800">បង្កើតយុទ្ធនាការថ្មី</h2>
                    <div className="flex space-x-2 mb-4">
                        {['view', 'sub', 'website'].map(t => (
                            <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded font-bold ${type === t ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="Link URL..." className="w-full p-3 border-2 border-gray-300 rounded-lg bg-white text-black font-medium" required />
                        <div className="flex justify-between space-x-2">
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500 font-bold">ចំនួន (Count)</label>
                                <input type="number" value={count} onChange={e => setCount(Math.max(1, parseInt(e.target.value)))} className="w-full p-3 border-2 border-gray-300 rounded-lg bg-white text-black font-medium" />
                            </div>
                            {type !== 'sub' && (
                                <div className="w-1/2">
                                    <label className="text-xs text-gray-500 font-bold">ពេល (Sec)</label>
                                    <input type="number" value={time} onChange={e => setTime(Math.max(10, parseInt(e.target.value)))} className="w-full p-3 border-2 border-gray-300 rounded-lg bg-white text-black font-medium" />
                                </div>
                            )}
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-lg text-center font-bold text-yellow-800 border border-yellow-400">
                            តម្លៃ: {formatNumber(calculateCost())} Coins
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-teal-700">
                            {isSubmitting ? 'កំពុងដាក់...' : 'ដាក់យុទ្ធនាការ'}
                        </button>
                    </form>
                </Card>
                <div className="space-y-2">
                    <h3 className="text-white font-bold">ប្រវត្តិ ({userCampaigns.length})</h3>
                    {userCampaigns.map(c => (
                        <div key={c.id} className="bg-white p-3 rounded-lg shadow flex justify-between items-center">
                            <div className='w-2/3'>
                                <p className="font-bold text-sm truncate text-gray-800">{c.link}</p>
                                <p className="text-xs text-gray-500">{c.type.toUpperCase()} - នៅសល់: {c.remaining}</p>
                            </div>
                            <span className={`text-xs font-bold ${c.remaining > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {c.remaining > 0 ? 'Active' : 'Finished'}
                            </span>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

// 2. Earn Points Page
const EarnPage = ({ db, userId, type, setPage, showNotification }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [current, setCurrent] = useState(null);
    const [timer, setTimer] = useState(0);
    const [claimed, setClaimed] = useState(false);
    const pageTitle = type === 'view' ? 'មើលវីដេអូ' : type === 'website' ? 'មើល Website' : 'Subscribe';

    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('type', '==', type));
        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.userId !== userId && c.remaining > 0);
            setCampaigns(list);
            if (!current && list.length > 0) setCurrent(list[0]);
        });
        return () => unsubscribe();
    }, [db, userId, type, current]);

    useEffect(() => {
        if (current) { setTimer(current.requiredDuration || 30); setClaimed(false); }
    }, [current]);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const handleClaim = async () => {
        if (timer > 0 || claimed) return;
        setClaimed(true);
        try {
            await runTransaction(db, async (transaction) => {
                const campRef = doc(getCampaignsCollectionRef(), current.id);
                const campDoc = await transaction.get(campRef);
                if (!campDoc.exists() || campDoc.data().remaining <= 0) throw new Error("Campaign finished");
                transaction.update(getProfileDocRef(userId), { points: increment(current.requiredDuration || 50) });
                transaction.update(campRef, { remaining: increment(-1) });
            });
            showNotification('ទទួលបានពិន្ទុ!', 'success');
            if (type === 'website' || type === 'sub') window.open(current.link, '_blank');
            const next = campaigns.filter(c => c.id !== current?.id && c.remaining > 0)[0];
            setCurrent(next || null);
        } catch (e) { showNotification('បរាជ័យ: ' + e.message, 'error'); }
    };

    return (
        <div className="min-h-screen bg-blue-900 pb-16 pt-20">
            <Header title={pageTitle} onBack={() => setPage('DASHBOARD')} />
            <main className="p-4">
                {current ? (
                    <Card className="p-4 text-center">
                        {type === 'view' ? (
                            <div className="aspect-video bg-black mb-4"><iframe src={current.link.includes('youtu') ? `https://www.youtube.com/embed/${current.link.split('v=')[1]?.split('&')[0] || current.link.split('/').pop()}?autoplay=0` : current.link} className="w-full h-full" frameBorder="0" allowFullScreen /></div>
                        ) : (
                            <div className="bg-gray-100 h-32 flex items-center justify-center mb-4 rounded"><Globe className="w-10 h-10 text-gray-400" /></div>
                        )}
                        <div className="flex justify-around mb-4">
                            <div className="text-center"><Coins className="w-6 h-6 mx-auto text-yellow-500" /><span className="font-bold text-gray-800">{current.requiredDuration} Pts</span></div>
                            <div className="text-center"><Zap className="w-6 h-6 mx-auto text-red-500" /><span className="font-bold text-gray-800">{timer}s</span></div>
                        </div>
                        <button onClick={handleClaim} disabled={timer > 0 || claimed} className={`w-full py-3 rounded font-bold text-white ${timer > 0 || claimed ? 'bg-gray-400' : 'bg-green-500'}`}>{timer > 0 ? `រង់ចាំ ${timer}s` : 'ទទួលពិន្ទុ (Claim)'}</button>
                    </Card>
                ) : <div className="text-white text-center mt-10 text-xl">មិនមានយុទ្ធនាការទេ</div>}
            </main>
        </div>
    );
};

// 3. Buy Coins Page
const BuyCoinsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const handlePurchase = async (pkg) => {
        try {
            await runTransaction(db, async (tx) => {
                tx.update(getProfileDocRef(userId), { points: increment(pkg.coins) });
            });
            showNotification(`ទិញបានជោគជ័យ! +${formatNumber(pkg.coins)} coins`, 'success');
        } catch (error) {
            showNotification(`បរាជ័យ: ${error.message}`, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-blue-900 pb-16 pt-20">
            <Header title="BUY COINS" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                {globalConfig.coinPackages.map((pkg) => (
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

// 4. Balance Details Page
const BalanceDetailsPage = ({ setPage, userProfile }) => {
    return (
        <div className="min-h-screen bg-blue-900 pb-16 pt-20">
            <Header title="MY BALANCE" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <Card className="bg-gradient-to-r from-teal-600 to-teal-800 text-center p-6 text-white">
                    <p className="text-sm opacity-80">សមតុល្យបច្ចុប្បន្ន</p>
                    <div className="flex justify-center items-center mt-2">
                        <Coins className="w-8 h-8 text-yellow-400 mr-2" />
                        <span className="text-4xl font-extrabold">{formatNumber(userProfile.points)}</span>
                    </div>
                </Card>
                <h3 className="text-white font-bold">ប្រវត្តិប្រតិបត្តិការ (Mock Data)</h3>
                <Card className="p-4">
                    <div className="space-y-3">
                        {[
                            { title: 'Daily Check-in', amount: 200, color: 'text-green-600' },
                            { title: 'Watch Video', amount: 50, color: 'text-green-600' },
                            { title: 'Buy Coins', amount: 5000, color: 'text-purple-600' },
                            { title: 'Create Campaign', amount: -1500, color: 'text-red-600' },
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between border-b pb-2 last:border-0">
                                <span className="text-gray-800 font-medium">{item.title}</span>
                                <span className={`font-bold ${item.color}`}>{item.amount > 0 ? '+' : ''}{item.amount}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </main>
        </div>
    );
};

// 5. Watch Ads Page
const WatchAdsPage = ({ db, userId, setPage, showNotification }) => {
    const [timer, setTimer] = useState(15);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        } else {
            setFinished(true);
        }
    }, [timer]);

    const claimReward = async () => {
        try {
            await runTransaction(db, async (tx) => {
                tx.update(getProfileDocRef(userId), { points: increment(30) });
            });
            showNotification('ទទួលបាន 30 Coins!', 'success');
            setPage('DASHBOARD');
        } catch (e) { showNotification(e.message, 'error'); }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 z-50">
            <div className="text-white text-2xl font-bold mb-4">កំពុងមើលពាណិជ្ជកម្ម...</div>
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center rounded-lg mb-6 border-2 border-yellow-500">
                <div className="text-center">
                    <MonitorPlay className="w-16 h-16 text-yellow-500 mx-auto mb-2" />
                    <p className="text-white">ADS SPACE</p>
                </div>
            </div>
            {finished ? (
                <button onClick={claimReward} className="bg-green-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg animate-bounce">
                    ទទួលរង្វាន់ (Claim)
                </button>
            ) : (
                <div className="text-white text-xl">រង់ចាំ: {timer} វិនាទី</div>
            )}
        </div>
    );
};

// 6. My Plan Page
const MyPlanPage = ({ setPage }) => (
    <div className="min-h-screen bg-blue-900 pb-16 pt-20">
        <Header title="MY PLAN" onBack={() => setPage('DASHBOARD')} />
        <main className="p-4">
            <Card className="p-6 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare className="w-10 h-10 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">FREE PLAN</h2>
                <p className="text-gray-500 mt-2">បច្ចុប្បន្នអ្នកកំពុងប្រើប្រាស់គម្រោងឥតគិតថ្លៃ។</p>
                <div className="mt-6 space-y-3 text-left">
                    <p className="flex items-center text-gray-700"><span className="mr-2 text-green-500">✔</span> មើលវីដេអូបាន</p>
                    <p className="flex items-center text-gray-700"><span className="mr-2 text-green-500">✔</span> ដាក់យុទ្ធនាការបាន</p>
                    <p className="flex items-center text-gray-700"><span className="mr-2 text-green-500">✔</span> ដកប្រាក់ (មិនទាន់ដំណើរការ)</p>
                </div>
                <button className="mt-8 w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-bold cursor-not-allowed">Upgrade (Soon)</button>
            </Card>
        </main>
    </div>
);

// 7. Admin Dashboard Page (NEWLY RESTORED)
const AdminDashboardPage = ({ db, setPage, showNotification }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [activeTab, setActiveTab] = useState('CAMPAIGNS');

    useEffect(() => {
        const q = query(getCampaignsCollectionRef());
        return onSnapshot(q, (snap) => {
            setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [db]);

    const handleDeleteCampaign = async (id) => {
        if(!window.confirm('Are you sure?')) return;
        try {
            await updateDoc(doc(getCampaignsCollectionRef(), id), { remaining: 0, isActive: false });
            showNotification('Deleted successfully', 'success');
        } catch(e) { showNotification(e.message, 'error'); }
    };

    return (
        <div className="min-h-screen bg-blue-900 pb-16 pt-20">
            <Header title="ADMIN PANEL" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4">
                <div className="flex space-x-2 mb-4">
                    <button onClick={() => setActiveTab('CAMPAIGNS')} className={`flex-1 py-2 rounded font-bold ${activeTab === 'CAMPAIGNS' ? 'bg-teal-500 text-white' : 'bg-gray-200'}`}>Campaigns</button>
                </div>

                {activeTab === 'CAMPAIGNS' && (
                    <div className="space-y-2">
                        {campaigns.map(c => (
                            <div key={c.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                                <div className='overflow-hidden'>
                                    <p className="font-bold text-sm truncate text-gray-800 w-48">{c.link}</p>
                                    <p className="text-xs text-gray-500">Rem: {c.remaining} | Type: {c.type}</p>
                                </div>
                                <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 bg-red-100 text-red-600 rounded-full"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

// --- Main App Component ---
const App = () => {
    const [page, setPage] = useState('DASHBOARD');
    const [userId, setUserId] = useState(null);
    const [userProfile, setUserProfile] = useState({});
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [notification, setNotification] = useState(null);
    const [authPage, setAuthPage] = useState('LOGIN');
    const [globalConfig, setGlobalConfig] = useState(defaultGlobalConfig);

    // ADMIN CONFIG: កំណត់ Email របស់អ្នកជា Admin តែម្នាក់គត់
    const ADMIN_EMAIL = "moeuphcarom268@gmail.com";
    const isAdmin = userProfile.email === ADMIN_EMAIL; 

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

    const handleRegister = async (email, password) => {
        if (password.length < 6) return showNotification('Password must be 6+ chars', 'error');
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;
            const shortId = getShortId(uid);
            await setDoc(getProfileDocRef(uid), { userId: uid, email, userName: `User_${shortId}`, points: 5000, shortId, createdAt: serverTimestamp(), referredBy: null });
            await setDoc(getShortCodeDocRef(shortId), { fullUserId: uid, shortId });
            showNotification('ចុះឈ្មោះជោគជ័យ!', 'success');
        } catch (e) { showNotification('បរាជ័យ: ' + e.code, 'error'); }
    };

    const handleLogout = async () => { await signOut(auth); showNotification('បានចាកចេញ', 'success'); };

    const handleDailyCheckin = async () => {
        if (userProfile.dailyCheckin) return showNotification('បាន Check-in រួចហើយ!', 'info');
        try {
            await runTransaction(db, async (tx) => {
                tx.update(getProfileDocRef(userId), { points: increment(globalConfig.dailyCheckinReward) });
                tx.set(getDailyStatusDocRef(userId), { checkinDone: true, date: getTodayDateKey() }, { merge: true });
            });
            showNotification('Check-in ជោគជ័យ!', 'success');
        } catch (e) { console.error(e); }
    };

    if (!isAuthReady) return <Loading />;

    if (!userId) return (
        <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-6">
                <h2 className="text-2xl font-bold text-center mb-4 text-teal-800">{authPage === 'LOGIN' ? 'ចូលគណនី' : 'បង្កើតគណនី'}</h2>
                <AuthForm onSubmit={authPage === 'LOGIN' ? handleLogin : handleRegister} btnText={authPage === 'LOGIN' ? 'ចូល' : 'ចុះឈ្មោះ'} />
                <div className="text-center mt-4">
                    <button onClick={() => setAuthPage(authPage === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-teal-600 underline">{authPage === 'LOGIN' ? 'មិនទាន់មានគណនី? ចុះឈ្មោះ' : 'មានគណនីហើយ? ចូល'}</button>
                </div>
            </Card>
            {notification && <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-2 rounded text-white bg-red-500`}>{notification.message}</div>}
        </div>
    );

    let Content;
    switch (page) {
        case 'EARN_POINTS': Content = <EarnPage db={db} userId={userId} type="view" setPage={setPage} showNotification={showNotification} />; break;
        case 'EXPLORE_WEBSITE': Content = <EarnPage db={db} userId={userId} type="website" setPage={setPage} showNotification={showNotification} />; break;
        case 'EXPLORE_SUBSCRIPTION': Content = <EarnPage db={db} userId={userId} type="sub" setPage={setPage} showNotification={showNotification} />; break;
        case 'MY_CAMPAIGNS': Content = <MyCampaignsPage db={db} userId={userId} userProfile={userProfile} setPage={setPage} showNotification={showNotification} />; break;
        case 'REFERRAL_PAGE': Content = <ReferralPage db={db} userId={userId} showNotification={showNotification} setPage={setPage} globalConfig={globalConfig} />; break;
        case 'BUY_COINS': Content = <BuyCoinsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'BALANCE_DETAILS': Content = <BalanceDetailsPage setPage={setPage} userProfile={userProfile} />; break;
        case 'WATCH_ADS': Content = <WatchAdsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} />; break;
        case 'MY_PLAN': Content = <MyPlanPage setPage={setPage} />; break;
        case 'ADMIN_DASHBOARD': Content = <AdminDashboardPage db={db} setPage={setPage} showNotification={showNotification} />; break;
        default:
            Content = (
                <div className="min-h-screen bg-blue-900 pb-16 pt-20">
                    <Header 
                        title="We4u App" 
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
                        <div className="bg-gradient-to-r from-teal-500 to-teal-700 rounded-xl p-6 text-white shadow-lg text-center relative overflow-hidden">
                            <div className="absolute -top-4 -left-4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
                            <p className="text-sm opacity-80">សមតុល្យរបស់អ្នក</p>
                            <h1 className="text-4xl font-bold my-2 flex justify-center items-center gap-2">{formatNumber(userProfile.points)} <Coins className="w-6 h-6 text-yellow-300" /></h1>
                            <p className="text-xs bg-white bg-opacity-20 inline-block px-3 py-1 rounded-full">ID: {userProfile.shortId}</p>
                        </div>
                    </div>
                    <div className="px-4">
                        <Card className="p-4 grid grid-cols-3 gap-3">
                            <IconButton icon={CalendarCheck} title="DAILY TASK" onClick={handleDailyCheckin} iconColor={userProfile.dailyCheckin ? 'text-gray-400' : 'text-blue-500'} textColor={userProfile.dailyCheckin ? 'text-gray-400' : 'text-gray-800'} />
                            <IconButton icon={BookOpen} title="MY PLAN" onClick={() => setPage('MY_PLAN')} iconColor="text-green-600" />
                            <IconButton icon={Film} title="PLAY VIDEO" onClick={() => setPage('EARN_POINTS')} iconColor="text-red-500" />
                            <IconButton icon={Wallet} title="MY BALANCE" onClick={() => setPage('BALANCE_DETAILS')} iconColor="text-orange-500" />
                            <IconButton icon={ShoppingCart} title="BUY COINS" onClick={() => setPage('BUY_COINS')} iconColor="text-purple-600" />
                            <IconButton icon={Target} title="CAMPAIGNS" onClick={() => setPage('MY_CAMPAIGNS')} iconColor="text-teal-600" />
                            <IconButton icon={UserPlus} title="ណែនាំមិត្ត" onClick={() => setPage('REFERRAL_PAGE')} iconColor="text-blue-600" />
                            <IconButton icon={Globe} title="មើល WEBSITE" onClick={() => setPage('EXPLORE_WEBSITE')} iconColor="text-indigo-600" />
                            <IconButton icon={MonitorPlay} title="មើល ADS" onClick={() => setPage('WATCH_ADS')} iconColor="text-pink-600" />
                        </Card>
                    </div>
                </div>
            );
    }

    return (
        <div className="font-sans bg-blue-900 min-h-screen relative">
            {Content}
            {notification && <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-50 text-white font-bold transition-all ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>{notification.message}</div>}
        </div>
    );
};

const AuthForm = ({ onSubmit, btnText }) => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(email, pass); }} className="space-y-3">
            <input className="w-full p-3 border border-gray-300 rounded bg-white text-black" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="w-full p-3 border border-gray-300 rounded bg-white text-black" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} required />
            <button className="w-full bg-teal-600 text-white p-3 rounded font-bold hover:bg-teal-700">{btnText}</button>
        </form>
    );
};

export default App;
