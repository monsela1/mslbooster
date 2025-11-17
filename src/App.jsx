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
    runTransaction, increment, limit
} from 'firebase/firestore';
import {
    Users, Coins, Video, Link, Globe, MonitorPlay, Zap,
    UserPlus, ChevronLeft, BookOpen, ShoppingCart,
    CalendarCheck, Target, Wallet, Film, UserCheck,
    DollarSign, LogOut, Mail, Lock, CheckSquare, Edit, Trash2, Settings, Copy, Save, Search, PlusCircle, MinusCircle, RefreshCw
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
const ADMIN_UID = "48wx8GPZbVYSxmfws1MxbuEOzsE3"; // UID Admin

// --- 2. FIREBASE INIT ---
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
    console.error("Firebase Error:", error);
}

// --- 3. HELPER FUNCTIONS ---
const getTodayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getShortId = (id) => id ? id.substring(0, 6).toUpperCase() : '------';
const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';

// Firestore Paths
const getProfileDocRef = (userId) => doc(db, 'artifacts', appId, 'users', userId, 'profile', 'user_data');
const getCampaignsCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'campaigns');
const getReferralCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'referrals');
const getDailyStatusDocRef = (userId) => doc(db, 'artifacts', appId, 'users', userId, 'daily_status', getTodayDateKey());
const getGlobalConfigDocRef = () => doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
const getShortCodeDocRef = (shortId) => doc(db, 'artifacts', appId, 'public', 'data', 'short_codes', shortId);

// Default Config
const defaultGlobalConfig = {
    dailyCheckinReward: 200,
    referrerReward: 1000,
    referredBonus: 500,
    adsReward: 30,
    maxDailyAds: 15,
    adsSettings: {
        bannerId: "ca-app-pub-xxxxxxxx/yyyyyy",
        interstitialId: "ca-app-pub-xxxxxxxx/zzzzzz",
        isEnabled: true
    },
    coinPackages: [
        { id: 1, coins: 5000, price: '5,000 Riel', color: 'bg-green-500' },
        { id: 2, coins: 15000, price: '15,000 Riel', color: 'bg-blue-500' },
        { id: 3, coins: 50000, price: '50,000 Riel', color: 'bg-purple-500' },
        { id: 4, coins: 150000, price: '150,000 Riel', color: 'bg-red-500' },
    ]
};

// --- 4. UI COMPONENTS ---
const Loading = () => (
    <div className="flex justify-center items-center h-screen bg-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400"></div>
    </div>
);

const IconButton = ({ icon: Icon, title, onClick, iconColor = 'text-purple-300', textColor = 'text-white', disabled = false }) => (
    <button 
        onClick={!disabled ? onClick : undefined} 
        className={`flex flex-col items-center justify-start p-2 rounded-xl w-full h-32 border ${disabled ? 'bg-gray-800 border-gray-700 opacity-60 cursor-not-allowed' : 'bg-purple-800 border-purple-700 shadow-lg active:scale-95'}`}
    >
        <div className={`p-3 rounded-xl ${disabled ? 'bg-gray-700' : 'bg-purple-900 shadow-inner'}`}>
            <Icon className={`w-8 h-8 ${disabled ? 'text-gray-500' : iconColor}`} />
        </div>
        <span className={`mt-2 text-xs font-bold text-center ${disabled ? 'text-gray-500' : textColor}`}>{title}</span>
    </button>
);

const Card = ({ children, className = '' }) => <div className={`bg-purple-800 rounded-xl shadow-xl border border-purple-700 text-white ${className}`}>{children}</div>;

const Header = ({ title, onBack, rightContent }) => (
    <header className="flex items-center justify-between p-4 bg-purple-950 shadow-md text-white fixed top-0 w-full z-20 border-b border-purple-800">
        <div className="flex items-center">
            {onBack && <button onClick={onBack} className="p-1 mr-2"><ChevronLeft /></button>}
            <h1 className="text-xl font-bold">{title}</h1>
        </div>
        {rightContent}
    </header>
);

const InputField = (props) => <input {...props} className={`w-full p-3 border border-purple-600 rounded bg-white text-black placeholder-gray-500 ${props.className || ''}`} />;

// --- 5. PAGES ---

// --- ADMIN PAGES ---
const AdminDashboardPage = ({ db, setPage, showNotification }) => {
    const [config, setConfig] = useState(defaultGlobalConfig);
    const [activeTab, setActiveTab] = useState('SETTINGS');
    
    // User Manager State
    const [searchId, setSearchId] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [pointsToAdd, setPointsToAdd] = useState(0);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(false);

    useEffect(() => {
        getDoc(getGlobalConfigDocRef()).then(doc => { if(doc.exists()) setConfig(doc.data()); });
    }, [db]);

    // Load Users List
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
        } catch (e) {}
        setLoadingList(false);
    };

    useEffect(() => { if(activeTab === 'USERS') loadUserList(); }, [activeTab]);

    const handleSaveConfig = async () => {
        await setDoc(getGlobalConfigDocRef(), config);
        showNotification('Settings Saved!', 'success');
    };
    
    // Config handlers
    const handleRewardChange = (e) => setConfig({...config, [e.target.name]: parseInt(e.target.value)||0});
    const handleAdsChange = (e) => setConfig({...config, adsSettings: {...config.adsSettings, [e.target.name]: e.target.value}});
    const handlePkgChange = (i, f, v) => {
        const pkgs = [...config.coinPackages];
        pkgs[i][f] = f === 'coins' ? parseInt(v)||0 : v;
        setConfig({...config, coinPackages: pkgs});
    };

    // User Handlers
    const handleSearchUser = async () => {
        try {
            const docSnap = await getDoc(getShortCodeDocRef(searchId.toUpperCase()));
            if(docSnap.exists()) {
                const uid = docSnap.data().fullUserId;
                const pSnap = await getDoc(getProfileDocRef(uid));
                if(pSnap.exists()) setFoundUser({uid, ...pSnap.data()});
            } else showNotification('User Not Found', 'error');
        } catch(e) {}
    };

    const handleUpdatePoints = async () => {
        if(!foundUser) return;
        // FIX: Force Integer
        const amount = parseInt(pointsToAdd);
        if (isNaN(amount)) return showNotification('Invalid Amount', 'error');

        try {
            await updateDoc(getProfileDocRef(foundUser.uid), { points: increment(amount) });
            showNotification('Points Updated', 'success');
            setFoundUser(prev => ({...prev, points: prev.points + amount}));
            setPointsToAdd(0);
            loadUserList();
        } catch (e) {
            console.error(e);
            showNotification('Update Failed (Check Rules)', 'error');
        }
    };

    const handleDeleteCampaign = async (id) => {
        if(window.confirm('Stop Campaign?')) await updateDoc(doc(getCampaignsCollectionRef(), id), { remaining: 0 });
    };

    if(!config) return <Loading/>;

    return (
        <div className="min-h-screen bg-purple-950 pb-16 pt-20 p-4">
            <Header title="ADMIN" onBack={() => setPage('DASHBOARD')} />
            <div className="flex gap-2 mb-4">
                {['SETTINGS', 'USERS', 'CAMPAIGNS'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 rounded font-bold ${activeTab===t ? 'bg-teal-500' : 'bg-gray-700'}`}>{t}</button>
                ))}
            </div>

            {activeTab === 'SETTINGS' && (
                <div className="space-y-4">
                    <Card className="p-4">
                        <h3 className="font-bold mb-2">Rewards</h3>
                        <div className="grid gap-2">
                            <label>Daily Reward: <InputField name="dailyCheckinReward" type="number" value={config.dailyCheckinReward} onChange={handleRewardChange}/></label>
                            <label>Referral Reward: <InputField name="referrerReward" type="number" value={config.referrerReward} onChange={handleRewardChange}/></label>
                            <label>Ads Reward: <InputField name="adsReward" type="number" value={config.adsReward} onChange={handleRewardChange}/></label>
                            <label>Max Daily Ads: <InputField name="maxDailyAds" type="number" value={config.maxDailyAds} onChange={handleRewardChange}/></label>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <h3 className="font-bold mb-2">Ads IDs</h3>
                        <div className="grid gap-2">
                             <InputField name="bannerId" value={config.adsSettings.bannerId} onChange={handleAdsChange} placeholder="Banner ID"/>
                             <InputField name="interstitialId" value={config.adsSettings.interstitialId} onChange={handleAdsChange} placeholder="Interstitial ID"/>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <h3 className="font-bold mb-2">Coin Packages</h3>
                        {config.coinPackages.map((p, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <InputField type="number" value={p.coins} onChange={e=>handlePkgChange(i,'coins',e.target.value)} />
                                <InputField value={p.price} onChange={e=>handlePkgChange(i,'price',e.target.value)} />
                            </div>
                        ))}
                    </Card>
                    <button onClick={handleSaveConfig} className="w-full bg-green-600 py-3 rounded font-bold text-white">SAVE ALL</button>
                </div>
            )}

            {activeTab === 'USERS' && (
                <div className="space-y-4">
                    <Card className="p-4">
                        <div className="flex gap-2 mb-4">
                            <InputField value={searchId} onChange={e=>setSearchId(e.target.value)} placeholder="Search ID (6 chars)" />
                            <button onClick={handleSearchUser} className="bg-blue-600 px-4 rounded"><Search/></button>
                        </div>
                        {foundUser && (
                            <div className="bg-purple-900 p-3 rounded">
                                <p className="font-bold">{foundUser.userName} ({foundUser.shortId})</p>
                                <p>Points: {formatNumber(foundUser.points)}</p>
                                <div className="flex gap-2 mt-2">
                                     <InputField type="number" value={pointsToAdd} onChange={e => setPointsToAdd(e.target.value)} placeholder="+/- Amount" />
                                     <button onClick={handleUpdatePoints} className="bg-teal-600 px-4 rounded font-bold">UPDATE</button>
                                </div>
                            </div>
                        )}
                    </Card>
                    <Card className="p-4">
                         <div className="flex justify-between mb-2"><h3>Recent Users</h3><button onClick={loadUserList}><RefreshCw size={16}/></button></div>
                         <div className="max-h-64 overflow-y-auto space-y-2">
                            {allUsers.map(u => (
                                <div key={u.uid} onClick={()=>{setFoundUser(u); setSearchId(u.shortId)}} className="flex justify-between bg-purple-900 p-2 rounded cursor-pointer border border-purple-700">
                                    <span>{u.userName}</span><span className="text-yellow-400">{formatNumber(u.points)}</span>
                                </div>
                            ))}
                         </div>
                    </Card>
                </div>
            )}

            {activeTab === 'CAMPAIGNS' && (
                <div className="space-y-2">
                    {campaigns.map(c => (
                        <div key={c.id} className="bg-white p-3 rounded shadow flex justify-between items-center text-black">
                            <div className='w-2/3 truncate'>
                                <p className="font-bold text-sm">{c.link}</p>
                                <p className="text-xs">Rem: {c.remaining} | {c.type}</p>
                            </div>
                            <button onClick={() => handleDeleteCampaign(c.id)} className="text-red-600"><Trash2/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ReferralPage = ({ userId, showNotification, setPage, globalConfig }) => {
    const [referrals, setReferrals] = useState([]);
    const shortId = getShortId(userId);
    const [inputCode, setInputCode] = useState('');

    useEffect(() => {
        onSnapshot(query(getReferralCollectionRef(), where('referrerId', '==', userId)), snap => {
            setReferrals(snap.docs.map(d => d.data()));
        });
    }, [userId]);

    const handleEnterCode = async () => {
        if(inputCode.length !== 6 || inputCode === shortId) return showNotification('Invalid Code', 'error');
        try {
            await runTransaction(db, async (tx) => {
                const codeDoc = await tx.get(getShortCodeDocRef(inputCode.toUpperCase()));
                if(!codeDoc.exists()) throw "Code not found";
                const referrerId = codeDoc.data().fullUserId;
                
                const myProfileRef = getProfileDocRef(userId);
                const myProfile = await tx.get(myProfileRef);
                if(myProfile.data().referredBy) throw "Already referred";

                // Ensure integer increments
                tx.update(getProfileDocRef(referrerId), { points: increment(parseInt(globalConfig.referrerReward)) });
                tx.update(myProfileRef, { points: increment(parseInt(globalConfig.referredBonus)), referredBy: inputCode.toUpperCase() });
                tx.set(doc(getReferralCollectionRef()), { referrerId, referredId: userId, referredName: myProfile.data().userName, reward: globalConfig.referrerReward, createdAt: serverTimestamp() });
            });
            showNotification('Success!', 'success');
        } catch(e) { showNotification('Failed: ' + e, 'error'); }
    };

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20 p-4">
            <Header title="REFERRAL" onBack={() => setPage('DASHBOARD')} />
            <Card className="p-6 text-center mb-4 border-yellow-500">
                <div className="text-4xl font-bold text-yellow-400 my-2">{shortId}</div>
                <p>Share to get {globalConfig.referrerReward} pts!</p>
                <button onClick={() => {navigator.clipboard.writeText(shortId); showNotification('Copied!');}} className="mt-4 bg-teal-600 px-4 py-2 rounded font-bold flex mx-auto"><Copy className="mr-2"/> Copy Code</button>
            </Card>
            <Card className="p-4 mb-4">
                <h3 className="font-bold mb-2">Enter Referrer Code</h3>
                <div className="flex gap-2">
                    <InputField value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={6} className="text-center uppercase" />
                    <button onClick={handleEnterCode} className="bg-yellow-500 text-black font-bold px-4 rounded">OK</button>
                </div>
            </Card>
            <Card className="p-4">
                <h3 className="font-bold mb-2">Referred Users ({referrals.length})</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {referrals.map((r, i) => <div key={i} className="flex justify-between bg-purple-700 p-2 rounded"><span>{r.referredName}</span><span className="text-green-400">+{r.reward}</span></div>)}
                </div>
            </Card>
        </div>
    );
};

const MyCampaignsPage = ({ userId, userProfile, setPage, showNotification }) => {
    const [type, setType] = useState('view');
    const [link, setLink] = useState('');
    const [count, setCount] = useState(10);
    const [time, setTime] = useState(60);
    const [camps, setCamps] = useState([]);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        return onSnapshot(query(getCampaignsCollectionRef(), where('userId', '==', userId)), snap => {
            setCamps(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.createdAt - a.createdAt));
        });
    }, [userId]);

    const cost = (type === 'sub' ? 50 : 1) * count * (type === 'sub' ? 1 : time);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(cost > userProfile.points) return showNotification('Not enough points', 'error');
        try {
            await runTransaction(db, async (tx) => {
                tx.update(getProfileDocRef(userId), { points: increment(-parseInt(cost)) });
                tx.set(doc(getCampaignsCollectionRef()), { userId, type, link, count, time, remaining: count, cost, createdAt: serverTimestamp(), isActive: true });
            });
            showNotification('Campaign Created!', 'success');
            setLink(''); setIsVerified(false);
        } catch(e) { showNotification('Error', 'error'); }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] pb-16 pt-20 p-4">
            <Header title="MY CAMPAIGNS" onBack={() => setPage('DASHBOARD')} />
            <Card className="p-4 mb-4 bg-[#0f172a]">
                <div className="flex gap-2 mb-4">
                    {['view', 'sub', 'website'].map(t => (
                        <button key={t} onClick={() => {setType(t); setIsVerified(false);}} className={`flex-1 py-2 rounded font-bold uppercase text-xs ${type === t ? 'bg-teal-600' : 'bg-gray-700'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex gap-2 mb-4">
                    <InputField value={link} onChange={e => {setLink(e.target.value); setIsVerified(false);}} placeholder="Link..." />
                    <button onClick={() => setIsVerified(true)} className={`px-4 rounded font-bold ${isVerified ? 'bg-red-500' : 'bg-red-600'}`}>{isVerified ? 'X' : 'CHECK'}</button>
                </div>
                {isVerified && (
                    <div className="space-y-3">
                        {(link.includes('youtu') || type==='view') && <div className="aspect-video bg-black"><iframe src={`https://www.youtube.com/embed/${link.split('v=')[1]?.split('&')[0] || link.split('/').pop()}?autoplay=1&mute=1`} className="w-full h-full" frameBorder="0"/></div>}
                        <div className="flex justify-between items-center"><label>Count</label><InputField type="number" value={count} onChange={e => setCount(Math.max(1, parseInt(e.target.value)))} className="w-24 text-center" /></div>
                        {type !== 'sub' && <div className="flex justify-between items-center"><label>Seconds</label><InputField type="number" value={time} onChange={e => setTime(Math.max(10, parseInt(e.target.value)))} className="w-24 text-center" /></div>}
                        <div className="flex justify-between text-yellow-400 font-bold"><span>Cost</span><span>{formatNumber(cost)}</span></div>
                        <button onClick={handleSubmit} className="w-full bg-yellow-600 py-3 rounded font-bold mt-2">DONE</button>
                    </div>
                )}
            </Card>
            <div className="space-y-2">
                {camps.map(c => (
                    <div key={c.id} className="bg-gray-800 p-2 rounded border-l-4 border-teal-500">
                        <p className="truncate text-xs text-gray-300">{c.link}</p>
                        <div className="flex justify-between text-xs font-bold mt-1">
                            <span className="text-gray-500">{c.type.toUpperCase()}</span>
                            <span className={c.remaining > 0 ? 'text-green-400' : 'text-red-400'}>{c.remaining > 0 ? `Active: ${c.remaining}` : 'Finished'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const EarnPage = ({ db, userId, type, setPage, showNotification, globalConfig }) => {
    const [list, setList] = useState([]);
    const [current, setCurrent] = useState(null);
    const [timer, setTimer] = useState(0);
    const [claimed, setClaimed] = useState(false);
    const [autoPlay, setAutoPlay] = useState(true);

    useEffect(() => {
        return onSnapshot(query(getCampaignsCollectionRef(), where('type', '==', type)), snap => {
            const items = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(c => c.userId !== userId && c.remaining > 0);
            setList(items);
            if(!current) setCurrent(items[0]);
        });
    }, [userId, type]);

    useEffect(() => { if(current) { setTimer(current.requiredDuration || 30); setClaimed(false); } }, [current]);

    useEffect(() => {
        if(timer > 0) { const i = setInterval(() => setTimer(t => t-1), 1000); return () => clearInterval(i); }
        else if(timer === 0 && !claimed && current && type !== 'sub') handleClaim();
    }, [timer, claimed, current]);

    const handleClaim = async () => {
        if(claimed) return;
        setClaimed(true);
        try {
            await runTransaction(db, async (tx) => {
                const ref = doc(getCampaignsCollectionRef(), current.id);
                const docSnap = await tx.get(ref);
                if(docSnap.data().remaining <= 0) throw "Finished";
                // Force int
                const points = parseInt(current.requiredDuration || 50);
                tx.update(getProfileDocRef(userId), { points: increment(points) });
                tx.update(ref, { remaining: increment(-1) });
            });
            showNotification('Points Added!', 'success');
            if(type === 'website') window.open(current.link, '_blank');
            setTimeout(handleNext, 1500);
        } catch(e) {}
    };

    const handleNext = () => setCurrent(list.filter(c => c.id !== current?.id)[0] || null);
    const handleSubClick = () => { window.open(current.link, '_blank'); handleClaim(); };

    if(!current) return <div className="min-h-screen bg-purple-900 pt-20 text-center text-white">No campaigns available</div>;

    return (
        <div className="min-h-screen bg-purple-900 pt-16 pb-4">
            <Header title="EARN" onBack={() => setPage('DASHBOARD')} />
            <div className="aspect-video bg-black">
                {(type === 'view' || type === 'sub') && <iframe src={`https://www.youtube.com/embed/${current.link.split('v=')[1]?.split('&')[0]}?autoplay=1&mute=0&controls=0`} className="w-full h-full" frameBorder="0"/>}
                {type === 'website' && <div className="flex items-center justify-center h-full text-white"><Globe size={48}/></div>}
            </div>
            <Card className="m-4 p-4 bg-white text-black">
                <div className="flex justify-between text-xl font-bold mb-4">
                    <span className="text-yellow-600 flex items-center"><Coins className="mr-1"/> {current.requiredDuration}</span>
                    <span className="text-red-600 flex items-center"><Zap className="mr-1"/> {timer}s</span>
                </div>
                {type === 'sub' && timer === 0 && !claimed ? 
                    <button onClick={handleSubClick} className="w-full bg-red-600 text-white py-3 rounded-full font-bold animate-bounce">SUBSCRIBE & CLAIM</button> :
                    <button disabled className="w-full bg-gray-300 text-white py-3 rounded-full font-bold">{timer > 0 ? 'Wait...' : 'Claiming...'}</button>
                }
                <button onClick={handleNext} className="w-full mt-2 py-2 text-gray-500 font-bold">SKIP</button>
                
                <div className="mt-4 flex justify-center items-center gap-2">
                    <span className="text-sm font-bold">Auto Play</span>
                    <button onClick={() => setAutoPlay(!autoPlay)} className={`w-10 h-5 rounded-full ${autoPlay ? 'bg-teal-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow transform transition ${autoPlay ? 'translate-x-5' : 'translate-x-1'}`}></div></button>
                </div>
            </Card>
             <div className="mx-4 bg-gray-200 h-16 flex items-center justify-center rounded border border-gray-400">
                <span className="text-xs text-gray-500">BANNER AD: {globalConfig.adsSettings?.bannerId}</span>
            </div>
        </div>
    );
};

// FIX: BuyCoinsPage - Force parseInt
const BuyCoinsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const handlePurchase = async (pkg) => {
        try {
            // FORCE INTEGER
            const amount = parseInt(pkg.coins);
            await runTransaction(db, async (tx) => { tx.update(getProfileDocRef(userId), { points: increment(amount) }); });
            showNotification(`Success! +${formatNumber(amount)}`, 'success');
        } catch (error) { showNotification(`Error`, 'error'); }
    };
    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20 p-4">
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

const BalanceDetailsPage = ({ setPage, userProfile }) => (
    <div className="min-h-screen bg-purple-900 pb-16 pt-20 p-4">
        <Header title="BALANCE" onBack={() => setPage('DASHBOARD')} />
        <Card className="text-center p-6 mb-4">
            <h1 className="text-4xl font-bold">{formatNumber(userProfile.points)} <Coins className="inline"/></h1>
        </Card>
        <div className="text-center text-white opacity-50">History coming soon...</div>
    </div>
);

const WatchAdsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const [adsWatched, setAdsWatched] = useState(0);
    const [timer, setTimer] = useState(15);
    const [finished, setFinished] = useState(false);
    const reward = globalConfig.adsReward || 30;
    const maxDaily = globalConfig.maxDailyAds || 15;

    useEffect(() => {
        return onSnapshot(getDailyStatusDocRef(userId), (doc) => {
            if(doc.exists()) setAdsWatched(doc.data().adsWatchedCount || 0);
        });
    }, [userId]);

    useEffect(() => {
        if (timer > 0) { const i = setInterval(() => setTimer(t => t - 1), 1000); return () => clearInterval(i); } 
        else setFinished(true);
    }, [timer]);

    const claimReward = async () => {
        if (adsWatched >= maxDaily) return showNotification('Daily Limit Reached', 'error');
        try {
            await runTransaction(db, async (tx) => { 
                const dailyRef = getDailyStatusDocRef(userId);
                // FORCE INTEGER
                tx.update(getProfileDocRef(userId), { points: increment(parseInt(reward)) });
                tx.set(dailyRef, { adsWatchedCount: increment(1), date: getTodayDateKey() }, { merge: true });
            });
            showNotification(`+${reward} Coins`, 'success');
            setPage('DASHBOARD');
        } catch (e) {}
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 z-50">
             <div className="absolute top-4 right-4 text-white">Watched: {adsWatched}/{maxDaily}</div>
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center mb-6 border-2 border-yellow-500">
                <p className="text-white">ADS: {globalConfig.adsSettings?.interstitialId}</p>
            </div>
            {finished && adsWatched < maxDaily ? <button onClick={claimReward} className="bg-green-500 px-8 py-3 rounded font-bold">CLAIM</button> : <div className="text-white">{adsWatched >= maxDaily ? 'Limit Reached' : `Wait ${timer}s`}</div>}
        </div>
    );
};

const MyPlanPage = ({ setPage }) => (
    <div className="min-h-screen bg-purple-900 pb-16 pt-20 p-4">
        <Header title="MY PLAN" onBack={() => setPage('DASHBOARD')} />
        <Card className="p-6 text-center">
            <CheckSquare className="w-16 h-16 mx-auto text-teal-400 mb-4"/>
            <h2 className="text-2xl font-bold">FREE PLAN</h2>
            <div className="mt-4 text-left space-y-2">
                <p>✔ View Videos</p><p>✔ Create Campaigns</p>
            </div>
        </Card>
    </div>
);

// --- AUTH ---
const AuthForm = ({ onSubmit, btnText, isRegister }) => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [username, setUsername] = useState('');

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit(email, pass, username); }} className="space-y-4">
            {isRegister && <InputField placeholder="ឈ្មោះ (Username)" value={username} onChange={e => setUsername(e.target.value)} required />}
            <InputField type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <InputField type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} required />
            <button className="w-full bg-teal-500 text-white p-3 rounded font-bold">{btnText}</button>
        </form>
    );
};

// --- MAIN ---
const App = () => {
    const [page, setPage] = useState('DASHBOARD');
    const [userId, setUserId] = useState(null);
    const [userProfile, setUserProfile] = useState({ points: 0, shortId: '...' });
    const [loading, setLoading] = useState(true);
    const [globalConfig, setConfig] = useState(defaultGlobalConfig);
    const [notification, setNotification] = useState(null);
    const [authPage, setAuthPage] = useState('LOGIN');
    const isAdmin = userId === ADMIN_UID;

    const showNotification = (msg, type = 'info') => { setNotification({message: msg, type}); setTimeout(() => setNotification(null), 3000); };

    useEffect(() => {
        return onAuthStateChanged(auth, u => {
            if(u) {
                setUserId(u.uid);
                onSnapshot(getProfileDocRef(u.uid), doc => {
                    if(doc.exists()) setUserProfile({ ...doc.data(), id: u.uid });
                    setLoading(false);
                });
            } else { setUserId(null); setLoading(false); }
        });
    }, []);

    useEffect(() => {
        return onSnapshot(getGlobalConfigDocRef(), doc => { if(doc.exists()) setConfig(doc.data()); });
    }, []);

    const handleRegister = async (email, pass, username) => {
        if(pass.length < 6) return showNotification("Password too short", "error");
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            const uid = cred.user.uid;
            const shortId = getShortId(uid);
            // Safe Creation
            await setDoc(getProfileDocRef(uid), { userId: uid, email, userName: username, points: 5000, shortId, referredBy: null });
            await setDoc(getShortCodeDocRef(shortId), { fullUserId: uid, shortId });
            await setDoc(getDailyStatusDocRef(uid), { date: getTodayDateKey(), checkinDone: false, adsWatchedCount: 0 });
            showNotification("Success!", "success");
        } catch(e) { showNotification(e.message, "error"); }
    };

    const handleDailyCheckin = async () => {
        try {
            await runTransaction(db, async (tx) => {
                const ref = getDailyStatusDocRef(userId);
                const doc = await tx.get(ref);
                if(doc.exists() && doc.data().checkinDone && doc.data().date === getTodayDateKey()) throw "Checked in already";
                // FORCE INT
                tx.update(getProfileDocRef(userId), { points: increment(parseInt(globalConfig.dailyCheckinReward)) });
                tx.set(ref, { checkinDone: true, date: getTodayDateKey() }, { merge: true });
            });
            showNotification("Claimed!", "success");
        } catch(e) { showNotification(e === "Checked in already" ? e : "Error", "info"); }
    };

    if(loading) return <Loading />;

    if(!userId) return (
        <div className="min-h-screen bg-purple-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-6">
                <h2 className="text-center text-2xl font-bold mb-4">{authPage}</h2>
                <AuthForm onSubmit={authPage === 'LOGIN' ? (e, p) => signInWithEmailAndPassword(auth, e, p).catch(err => showNotification(err.code, 'error')) : handleRegister} btnText={authPage} isRegister={authPage === 'REGISTER'} />
                <button onClick={() => setAuthPage(authPage === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full mt-4 text-teal-300 underline">Switch to {authPage === 'LOGIN' ? 'Register' : 'Login'}</button>
            </Card>
            {notification && <div className="fixed top-4 left-0 w-full text-center"><span className="bg-red-500 text-white p-2 rounded">{notification.message}</span></div>}
        </div>
    );

    let Content;
    switch(page) {
        case 'EARN_POINTS': Content = <EarnPage db={db} userId={userId} type="view" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_SUBSCRIPTION': Content = <EarnPage db={db} userId={userId} type="sub" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_WEBSITE': Content = <EarnPage db={db} userId={userId} type="website" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_CAMPAIGNS': Content = <MyCampaignsPage db={db} userId={userId} userProfile={userProfile} setPage={setPage} showNotification={showNotification} />; break;
        case 'REFERRAL_PAGE': Content = <ReferralPage db={db} userId={userId} showNotification={showNotification} setPage={setPage} globalConfig={globalConfig} />; break;
        case 'BUY_COINS': Content = <BuyCoinsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'BALANCE_DETAILS': Content = <BalanceDetailsPage setPage={setPage} userProfile={userProfile} />; break;
        case 'WATCH_ADS': Content = <WatchAdsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_PLAN': Content = <MyPlanPage setPage={setPage} />; break;
        case 'ADMIN_DASHBOARD': Content = <AdminDashboardPage db={db} setPage={setPage} showNotification={showNotification} />; break;
        default: Content = (
            <div className="min-h-screen bg-purple-900 pb-16 pt-20">
                <Header title="We4u App" rightContent={isAdmin ? <button onClick={() => setPage('ADMIN_DASHBOARD')}><Settings/></button> : <button onClick={() => signOut(auth)}><LogOut/></button>} />
                <div className="px-4 mb-6"><div className="bg-gradient-to-r from-teal-500 to-teal-700 rounded-xl p-6 text-white shadow-lg text-center"><h1 className="text-4xl font-bold">{formatNumber(userProfile.points)} <Coins className="inline"/></h1><p>ID: {userProfile.shortId}</p></div></div>
                <div className="px-4"><Card className="p-4 grid grid-cols-3 gap-3">
                    <IconButton icon={CalendarCheck} title="DAILY TASK" onClick={handleDailyCheckin} disabled={userProfile.dailyCheckin} />
                    <IconButton icon={UserCheck} title="SUBSCRIBE" onClick={() => setPage('EXPLORE_SUBSCRIPTION')} />
                    <IconButton icon={Film} title="PLAY VIDEO" onClick={() => setPage('EARN_POINTS')} />
                    <IconButton icon={Wallet} title="MY BALANCE" onClick={() => setPage('BALANCE_DETAILS')} />
                    <IconButton icon={ShoppingCart} title="BUY COINS" onClick={() => setPage('BUY_COINS')} />
                    <IconButton icon={Target} title="CAMPAIGNS" onClick={() => setPage('MY_CAMPAIGNS')} />
                    <IconButton icon={UserPlus} title="REFERRAL" onClick={() => setPage('REFERRAL_PAGE')} />
                    <IconButton icon={Globe} title="WEBSITE" onClick={() => setPage('EXPLORE_WEBSITE')} />
                    <IconButton icon={MonitorPlay} title="WATCH ADS" onClick={() => setPage('WATCH_ADS')} />
                </Card></div>
                <div className="px-4 mt-6"><div className="w-full bg-white h-16 flex items-center justify-center rounded"><span className="text-gray-500 text-xs">BANNER AD: {globalConfig.adsSettings?.bannerId}</span></div></div>
            </div>
        );
    }

    return (
        <div className="font-sans bg-purple-900 min-h-screen relative">
            {Content}
            {notification && <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50">{notification.message}</div>}
        </div>
    );
};

export default App;
