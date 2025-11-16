import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    signInWithCustomToken,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot,
    collection, query, where, addDoc, serverTimestamp,
    runTransaction, getDocs, increment
} from 'firebase/firestore';
import {
    Users, Coins, Video, Link, Globe, MonitorPlay, CheckSquare, Zap,
    UserPlus, ChevronLeft, Trash2, Edit, BookOpen, ShoppingCart,
    Gift, Info, X, CalendarCheck, Target, Wallet, Film, Calendar,
    Settings, DollarSign, ShieldCheck, LogOut, Mail, Lock
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
let app;
let db;
let auth;

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

// Firestore Paths helpers
const getProfileDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'profile', 'user_data') : null;
const getCampaignsCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'campaigns') : null;
const getReferralCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'referrals') : null;
const getDailyStatusDocRef = (userId) => {
    if (!db || !userId) return null;
    return doc(db, 'artifacts', appId, 'users', userId, 'daily_status', getTodayDateKey());
};
const getGlobalConfigDocRef = () => db ? doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings') : null;
const getShortCodeDocRef = (shortId) => db && shortId ? doc(db, 'artifacts', appId, 'public', 'data', 'short_codes', shortId) : null;

const defaultGlobalConfig = {
    dailyCheckinReward: 200,
    referrerReward: 1000,
    referredBonus: 500,
    coinPackages: [
        { id: 1, coins: 5000, price: '5,000 Riel', color: 'bg-green-500', shadow: 'shadow-green-700' },
        { id: 2, coins: 15000, price: '15,000 Riel', color: 'bg-blue-500', shadow: 'shadow-blue-700' },
        { id: 3, coins: 50000, price: '50,000 Riel', color: 'bg-purple-500', shadow: 'shadow-purple-700' },
        { id: 4, coins: 150000, price: '150,000 Riel', color: 'bg-red-500', shadow: 'shadow-red-700' },
    ],
    adPlatforms: ['AdMob', 'Facebook Ads', 'Unity Ads'],
    adSlots: { homepageBanner: 'Banner_123', videoInterstitia: 'Video_456' }
};

// --- UI Components ---

const Loading = () => (
    <div className="flex justify-center items-center h-screen bg-blue-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500"></div>
        <span className="ml-3 text-white text-lg font-semibold">កំពុងផ្ទុក...</span>
    </div>
);

const IconButton = ({ icon: Icon, title, onClick, iconColor = 'text-gray-600', textColor = 'text-gray-800' }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-start p-2 rounded-xl transition transform hover:scale-105 active:scale-95 w-full h-32">
        <div className={`p-3 rounded-xl bg-gray-100 shadow-sm`}>
            <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        <span className={`mt-2 text-xs font-semibold text-center ${textColor} break-words`}>{title}</span>
    </button>
);

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-xl ${className}`}>{children}</div>
);

const Header = ({ title, onBack, className = '' }) => (
    <header className={`flex items-center justify-between p-4 bg-green-700 shadow-md text-white fixed top-0 w-full z-10 ${className}`}>
        <div className="flex items-center">
            {onBack && (
                <button onClick={onBack} className="p-1 mr-2 rounded-full hover:bg-green-600 transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            <h1 className="text-xl font-bold">{title}</h1>
        </div>
    </header>
);

const getCampaignIcon = (type) => {
    switch (type) {
        case 'view': return { icon: Film, color: 'text-red-500' };
        case 'sub': return { icon: UserCheck, color: 'text-pink-500' };
        case 'website': return { icon: Globe, color: 'text-blue-500' };
        default: return { icon: Link, color: 'text-gray-500' };
    }
};

// --- Feature Pages ---

// 1. Campaigns Page
const MyCampaignsPage = ({ db, userId, userProfile, setPage, showNotification }) => {
    const [type, setType] = useState('view');
    const [link, setLink] = useState('');
    const [count, setCount] = useState(10);
    const [time, setTime] = useState(60);
    const [userCampaigns, setUserCampaigns] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!db || !userId) return;
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
                            <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded font-bold ${type === t ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="Link URL..." className="w-full p-2 border rounded" required />
                        <div className="flex justify-between space-x-2">
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500">ចំនួន (Count)</label>
                                <input type="number" value={count} onChange={e => setCount(Math.max(1, parseInt(e.target.value)))} className="w-full p-2 border rounded" />
                            </div>
                            {type !== 'sub' && (
                                <div className="w-1/2">
                                    <label className="text-xs text-gray-500">ពេល (Sec)</label>
                                    <input type="number" value={time} onChange={e => setTime(Math.max(10, parseInt(e.target.value)))} className="w-full p-2 border rounded" />
                                </div>
                            )}
                        </div>
                        <div className="bg-yellow-100 p-2 rounded text-center font-bold text-yellow-800">
                            តម្លៃ: {formatNumber(calculateCost())} Coins
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-green-600 text-white py-3 rounded font-bold">
                            {isSubmitting ? 'កំពុងដាក់...' : 'ដាក់យុទ្ធនាការ'}
                        </button>
                    </form>
                </Card>

                <div className="space-y-2">
                    <h3 className="text-white font-bold">ប្រវត្តិ ({userCampaigns.length})</h3>
                    {userCampaigns.map(c => (
                        <div key={c.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                            <div>
                                <p className="font-bold text-sm truncate w-40">{c.link}</p>
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
const EarnPage = ({ db, userId, type, setPage, showNotification, globalConfig }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [current, setCurrent] = useState(null);
    const [timer, setTimer] = useState(0);
    const [claimed, setClaimed] = useState(false);

    const pageTitle = type === 'view' ? 'មើលវីដេអូ (View)' : type === 'website' ? 'មើល Website' : 'Subscribe';

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(getCampaignsCollectionRef(), where('type', '==', type));
        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(c => c.userId !== userId && c.remaining > 0);
            setCampaigns(list);
            if (!current && list.length > 0) setCurrent(list[0]);
        });
        return () => unsubscribe();
    }, [db, userId, type, current]);

    useEffect(() => {
        if (current) {
            setTimer(current.requiredDuration || 30);
            setClaimed(false);
        }
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
            nextCampaign();
        } catch (e) {
            showNotification('បរាជ័យ: ' + e.message, 'error');
        }
    };

    const nextCampaign = () => {
        const next = campaigns.filter(c => c.id !== current?.id && c.remaining > 0)[0];
        setCurrent(next || null);
    };

    const getEmbedUrl = (link) => {
        try {
             if (link.includes('youtu')) {
                 const id = link.split('v=')[1]?.split('&')[0] || link.split('/').pop();
                 return `https://www.youtube.com/embed/${id}?autoplay=0`;
             }
        } catch(e) {}
        return link;
    };

    return (
        <div className="min-h-screen bg-blue-900 pb-16 pt-20">
            <Header title={pageTitle} onBack={() => setPage('DASHBOARD')} />
            <main className="p-4">
                {current ? (
                    <Card className="p-4 text-center">
                        {type === 'view' ? (
                            <div className="aspect-video bg-black mb-4">
                                <iframe src={getEmbedUrl(current.link)} className="w-full h-full" frameBorder="0" allowFullScreen />
                            </div>
                        ) : (
                             <div className="bg-gray-100 h-32 flex items-center justify-center mb-4 rounded">
                                 <Globe className="w-10 h-10 text-gray-400"/>
                                 <span className="ml-2 text-gray-600 truncate w-48">{current.link}</span>
                             </div>
                        )}

                        <div className="flex justify-around mb-4">
                            <div className="text-center">
                                <Coins className="w-6 h-6 mx-auto text-yellow-500" />
                                <span className="font-bold">{current.requiredDuration} Pts</span>
                            </div>
                            <div className="text-center">
                                <Zap className="w-6 h-6 mx-auto text-red-500" />
                                <span className="font-bold">{timer}s</span>
                            </div>
                        </div>

                        <button onClick={handleClaim} disabled={timer > 0 || claimed} className={`w-full py-3 rounded font-bold text-white ${timer > 0 || claimed ? 'bg-gray-400' : 'bg-green-500'}`}>
                            {timer > 0 ? `រង់ចាំ ${timer}s` : 'ទទួលពិន្ទុ (Claim)'}
                        </button>
                        <button onClick={nextCampaign} className="mt-3 text-sm text-gray-500 underline">មើលបន្ទាប់ (Skip)</button>
                    </Card>
                ) : (
                    <div className="text-white text-center mt-10">មិនមានយុទ្ធនាការទេ</div>
                )}
            </main>
        </div>
    );
};

// 3. Referral Page
const ReferralPage = ({ db, userId, showNotification, setPage, globalConfig }) => {
    const [referrals, setReferrals] = useState([]);
    const shortId = getShortId(userId);

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(getReferralCollectionRef(), where('referrerId', '==', userId));
        onSnapshot(q, (snap) => {
            setReferrals(snap.docs.map(d => d.data()));
        });
    }, [db, userId]);

    return (
        <div className="min-h-screen bg-blue-900 pb-16 pt-20">
            <Header title="ណែនាំមិត្ត" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <Card className="p-6 text-center bg-yellow-50">
                    <h3 className="font-bold text-gray-700">កូដណែនាំរបស់អ្នក</h3>
                    <div className="text-3xl font-mono font-bold text-red-600 my-3 tracking-widest">{shortId}</div>
                    <p className="text-sm text-gray-500">ចែករំលែកកូដនេះដើម្បីទទួលបាន {formatNumber(globalConfig.referrerReward)} ពិន្ទុ!</p>
                    <button onClick={() => {navigator.clipboard.writeText(shortId); showNotification('ចម្លងរួចរាល់!', 'success')}} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-full text-sm">
                        ចម្លងកូដ
                    </button>
                </Card>
                <Card className="p-4">
                    <h3 className="font-bold mb-2">បញ្ជីអ្នកដែលបានណែនាំ ({referrals.length})</h3>
                    <div className="max-h-60 overflow-y-auto">
                        {referrals.length > 0 ? referrals.map((r, i) => (
                            <div key={i} className="flex justify-between border-b py-2">
                                <span className="text-gray-700">{r.referredName}</span>
                                <span className="text-green-600 font-bold">+{r.reward}</span>
                            </div>
                        )) : <p className="text-gray-400 text-center text-sm">មិនទាន់មានការណែនាំ</p>}
                    </div>
                </Card>
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

    const showNotification = useCallback((msg, type = 'info') => {
        setNotification({ message: msg, type });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    useEffect(() => {
        if (!auth) return;
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setPage('DASHBOARD');
            }
            setIsAuthReady(true);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!db || !userId) return;
        const unsub = onSnapshot(getProfileDocRef(userId), (doc) => {
            if (doc.exists()) {
                setUserProfile({ ...doc.data(), id: userId });
            }
        });
        return () => unsub();
    }, [db, userId]);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(getGlobalConfigDocRef(), (doc) => {
            if (doc.exists()) setGlobalConfig({ ...defaultGlobalConfig, ...doc.data() });
        });
        return () => unsub();
    }, [db]);

    const handleLogin = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification('ចូលគណនីជោគជ័យ', 'success');
        } catch (e) {
            showNotification('បរាជ័យ: ' + e.code, 'error');
        }
    };

    const handleRegister = async (email, password) => {
        if (password.length < 6) {
            showNotification('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ', 'error');
            return;
        }
        if (!auth) {
            showNotification('បញ្ហា Firebase Auth', 'error');
            return;
        }
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;
            const shortId = getShortId(uid);
            
            if (!db) {
                console.error("Firestore DB is not initialized.");
                showNotification('ចុះឈ្មោះបានតែគណនី (Database Error)', 'error');
                return;
            }

            try {
                const profileRef = getProfileDocRef(uid);
                if (profileRef) {
                    await setDoc(profileRef, {
                        userId: uid, 
                        email, 
                        userName: `User_${shortId}`,
                        points: 5000, 
                        shortId, 
                        createdAt: serverTimestamp(),
                        referredBy: null
                    });
                }

                const shortCodeRef = getShortCodeDocRef(shortId);
                if (shortCodeRef) {
                    await setDoc(shortCodeRef, { fullUserId: uid, shortId });
                }
                showNotification('ចុះឈ្មោះជោគជ័យ!', 'success');
            } catch (dbError) {
                console.error("Database write failed:", dbError);
                showNotification('គណនីកើតហើយ ប៉ុន្តែទិន្នន័យមិនទាន់រក្សាទុក (Check Rules)', 'error');
            }
        } catch (e) {
            console.error("Registration Error:", e);
            let msg = 'ចុះឈ្មោះបរាជ័យ';
            if (e.code === 'auth/email-already-in-use') msg = 'អ៊ីមែលនេះត្រូវបានប្រើប្រាស់រួចហើយ';
            if (e.code === 'auth/invalid-email') msg = 'អ៊ីមែលមិនត្រឹមត្រូវ';
            if (e.code === 'auth/weak-password') msg = 'ពាក្យសម្ងាត់ខ្សោយពេក';
            showNotification(msg, 'error');
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        showNotification('បានចាកចេញ', 'success');
    };

    const handleDailyCheckin = async () => {
        if(userProfile.dailyCheckin) return showNotification('បាន Check-in រួចហើយ!', 'info');
        try {
            await runTransaction(db, async (tx) => {
                tx.update(getProfileDocRef(userId), { points: increment(globalConfig.dailyCheckinReward) });
                tx.set(getDailyStatusDocRef(userId), { checkinDone: true, date: getTodayDateKey() }, { merge: true });
            });
            showNotification('Check-in ជោគជ័យ +'+ globalConfig.dailyCheckinReward, 'success');
        } catch(e) {
            console.error(e);
        }
    };

    if (!isAuthReady) return <Loading />;

    if (!userId) {
        return (
            <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm p-6">
                    <h2 className="text-2xl font-bold text-center mb-4 text-teal-800">{authPage === 'LOGIN' ? 'ចូលគណនី' : 'បង្កើតគណនី'}</h2>
                    <AuthForm onSubmit={authPage === 'LOGIN' ? handleLogin : handleRegister} btnText={authPage === 'LOGIN' ? 'ចូល' : 'ចុះឈ្មោះ'} />
                    <div className="text-center mt-4">
                        <button onClick={() => setAuthPage(authPage === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-teal-600 underline">
                            {authPage === 'LOGIN' ? 'មិនទាន់មានគណនី? ចុះឈ្មោះ' : 'មានគណនីហើយ? ចូល'}
                        </button>
                    </div>
                </Card>
                {notification && <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-2 rounded text-white ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{notification.message}</div>}
            </div>
        );
    }

    let Content;
    switch (page) {
        case 'EARN_POINTS': Content = <EarnPage db={db} userId={userId} type="view" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_WEBSITE': Content = <EarnPage db={db} userId={userId} type="website" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_SUBSCRIPTION': Content = <EarnPage db={db} userId={userId} type="sub" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_CAMPAIGNS': Content = <MyCampaignsPage db={db} userId={userId} userProfile={userProfile} setPage={setPage} showNotification={showNotification} />; break;
        case 'REFERRAL_PAGE': Content = <ReferralPage db={db} userId={userId} showNotification={showNotification} setPage={setPage} globalConfig={globalConfig} />; break;
        default: 
            Content = (
                <div className="min-h-screen bg-blue-900 pb-16 pt-20">
                    <Header title="We4u App" className="z-20" />
                    <div className="absolute top-3 right-4 z-30">
                        <button onClick={handleLogout} className="bg-red-500 text-white text-xs px-3 py-1 rounded shadow">Logout</button>
                    </div>

                    <div className="px-4 mb-6">
                         <div className="bg-gradient-to-r from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg text-center relative overflow-hidden">
                            <div className="absolute -top-4 -left-4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
                            <p className="text-sm opacity-80">សមតុល្យរបស់អ្នក</p>
                            <h1 className="text-4xl font-bold my-2 flex justify-center items-center gap-2">
                                {formatNumber(userProfile.points)} <Coins className="w-6 h-6 text-yellow-300"/>
                            </h1>
                            <p className="text-xs bg-white bg-opacity-20 inline-block px-3 py-1 rounded-full">ID: {userProfile.shortId}</p>
                         </div>
                    </div>

                    <div className="px-4">
                        <Card className="p-4 grid grid-cols-3 gap-4">
                            <IconButton icon={CalendarCheck} title="Daily Check-in" onClick={handleDailyCheckin} iconColor="text-blue-500" />
                            <IconButton icon={Film} title="មើលវីដេអូ" onClick={() => setPage('EARN_POINTS')} iconColor="text-red-500" />
                            <IconButton icon={Globe} title="មើល Website" onClick={() => setPage('EXPLORE_WEBSITE')} iconColor="text-indigo-500" />
                            <IconButton icon={UserCheck} title="Subscribe" onClick={() => setPage('EXPLORE_SUBSCRIPTION')} iconColor="text-pink-500" />
                            <IconButton icon={Target} title="ដាក់យុទ្ធនាការ" onClick={() => setPage('MY_CAMPAIGNS')} iconColor="text-green-600" />
                            <IconButton icon={UserPlus} title="ណែនាំមិត្ត" onClick={() => setPage('REFERRAL_PAGE')} iconColor="text-purple-500" />
                        </Card>
                    </div>
                </div>
            );
    }

    return (
        <div className="font-sans bg-blue-900 min-h-screen relative">
            {Content}
            {notification && (
                <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-50 text-white font-bold transition-all ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
};

const AuthForm = ({ onSubmit, btnText }) => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(email, pass); }} className="space-y-3">
            <input className="w-full p-3 border rounded" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="w-full p-3 border rounded" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} required />
            <button className="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700">{btnText}</button>
        </form>
    );
};

export default App;
