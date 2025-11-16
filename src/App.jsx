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
    runTransaction, increment, limit, orderBy
} from 'firebase/firestore';
import {
    Users, Coins, Video, Link, Globe, MonitorPlay, Zap,
    UserPlus, ChevronLeft, BookOpen, ShoppingCart,
    CalendarCheck, Target, Wallet, Film, UserCheck,
    DollarSign, LogOut, Mail, Lock, CheckSquare, Edit, Trash2, Settings, Copy, Save, Search, PlusCircle, MinusCircle, CheckCircle, XCircle, RefreshCw
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
const getTodayDateKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getShortId = (id) => id?.substring(0, 6).toUpperCase() || '------';
const formatNumber = (num) => num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';

// Firestore Paths
const getProfileDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'profile', 'user_data') : null;
const getCampaignsCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'campaigns') : null;
const getReferralCollectionRef = () => db ? collection(db, 'artifacts', appId, 'public', 'data', 'referrals') : null;
const getDailyStatusDocRef = (userId) => db && userId ? doc(db, 'artifacts', appId, 'users', userId, 'daily_status', getTodayDateKey()) : null;
const getGlobalConfigDocRef = () => db ? doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings') : null;
const getShortCodeDocRef = (shortId) => db && shortId ? doc(db, 'artifacts', appId, 'public', 'data', 'short_codes', shortId) : null;

// --- Default Config ---
const defaultGlobalConfig = {
    dailyCheckinReward: 200,
    referrerReward: 1000,
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

// --- UI Components (Purple Theme) ---
const Loading = () => (
    <div className="flex justify-center items-center h-screen bg-purple-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400"></div>
        <span className="ml-3 text-white text-lg font-semibold">កំពុងផ្ទុក...</span>
    </div>
);

const IconButton = ({ icon: Icon, title, onClick, iconColor = 'text-purple-300', textColor = 'text-white', disabled = false }) => (
    <button 
        onClick={!disabled ? onClick : undefined} 
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

// --- ADMIN SUB-COMPONENTS ---

const AdminSettingsTab = ({ config, setConfig, onSave }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    };

    const handleAdsChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            adsSettings: { ...prev.adsSettings, [name]: value }
        }));
    };

    const handlePackageChange = (index, field, value) => {
        const newPackages = [...config.coinPackages];
        newPackages[index][field] = field === 'coins' ? (parseInt(value) || 0) : value;
        setConfig(prev => ({ ...prev, coinPackages: newPackages }));
    };

    return (
        <div className="space-y-4">
            <Card className="p-4 border-l-4 border-yellow-400">
                <h3 className="font-bold text-lg mb-3 text-yellow-400 flex items-center"><Coins className="w-5 h-5 mr-2"/> ការកំណត់រង្វាន់</h3>
                <div className="grid grid-cols-1 gap-3">
                    <div><label className="text-xs font-bold text-purple-300">Daily Check-in Points</label><InputField name="dailyCheckinReward" type="number" value={config.dailyCheckinReward} onChange={handleChange} /></div>
                    <div><label className="text-xs font-bold text-purple-300">Referral Reward Points</label><InputField name="referrerReward" type="number" value={config.referrerReward} onChange={handleChange} /></div>
                     <div><label className="text-xs font-bold text-purple-300">Watch Ads Reward</label><InputField name="adsReward" type="number" value={config.adsReward} onChange={handleChange} /></div>
                </div>
            </Card>

            <Card className="p-4 border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-3 text-green-400 flex items-center"><ShoppingCart className="w-5 h-5 mr-2"/> កំណត់កញ្ចប់កាក់ (Sell Coins)</h3>
                <div className="space-y-3">
                    {config.coinPackages.map((pkg, idx) => (
                        <div key={pkg.id} className="flex space-x-2 items-center bg-purple-900 p-2 rounded">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">{idx + 1}</div>
                            <div className="flex-1">
                                <label className="text-xs text-purple-300">ចំនួនកាក់</label>
                                <InputField type="number" value={pkg.coins} onChange={(e) => handlePackageChange(idx, 'coins', e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-purple-300">តម្លៃលក់</label>
                                <InputField type="text" value={pkg.price} onChange={(e) => handlePackageChange(idx, 'price', e.target.value)} />
                            </div>
                        </div>
                    ))}
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

// --- MODIFIED: USER MANAGER TAB WITH USER LIST ---
const AdminUserManagerTab = ({ db, showNotification }) => {
    const [searchId, setSearchId] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [pointsToAdd, setPointsToAdd] = useState(0);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(false);

    // Load recent users
    const loadUserList = async () => {
        setLoadingList(true);
        try {
            // Fetch short codes doc to map to profiles
            const shortCodesRef = collection(db, 'artifacts', appId, 'public', 'data', 'short_codes');
            const q = query(shortCodesRef, limit(20)); // Limit to 20 for performance
            const snap = await getDocs(q);
            
            const usersData = await Promise.all(snap.docs.map(async (docSnap) => {
                const { fullUserId, shortId } = docSnap.data();
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

    useEffect(() => {
        loadUserList();
    }, []);

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
            loadUserList(); // Refresh list
        } catch(e) { showNotification('Update failed', 'error'); }
    };

    return (
        <div className='space-y-4'>
            {/* Edit Section */}
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
                    <div className="bg-purple-900 p-4 rounded-lg border border-purple-600">
                        <p className="font-bold text-lg text-white">{foundUser.userName}</p>
                        <p className="text-purple-300 text-sm">Email: {foundUser.email}</p>
                        <p className="text-purple-300 text-sm mb-2">Current Points: <span className="font-bold text-yellow-400">{formatNumber(foundUser.points)}</span></p>
                        
                        <div className="flex items-center space-x-2 mt-4">
                            <button onClick={() => setPointsToAdd(p => p - 100)} className="p-2 bg-red-600 rounded text-white"><MinusCircle size={20}/></button>
                            <InputField 
                                type="number" 
                                value={pointsToAdd} 
                                onChange={e => setPointsToAdd(e.target.value)} 
                                className="text-center font-bold"
                            />
                            <button onClick={() => setPointsToAdd(p => p + 100)} className="p-2 bg-green-600 rounded text-white"><PlusCircle size={20}/></button>
                        </div>
                        <button onClick={handleUpdatePoints} className="w-full mt-3 bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700">Update Points</button>
                    </div>
                )}
            </Card>

            {/* User List Table */}
            <Card className="p-4">
                <div className='flex justify-between items-center mb-3'>
                    <h3 className="font-bold text-lg text-white">បញ្ជីអ្នកប្រើប្រាស់ ({allUsers.length})</h3>
                    <button onClick={loadUserList} className='p-2 bg-purple-600 rounded hover:bg-purple-500'><RefreshCw size={18} className='text-white'/></button>
                </div>
                
                {loadingList ? <div className='text-center text-purple-300'>Loading users...</div> : (
                    <div className='overflow-y-auto max-h-64 space-y-2'>
                        {allUsers.map((u, i) => (
                            <div key={i} onClick={() => {setFoundUser(u); setSearchId(u.shortId);}} className='flex justify-between items-center bg-purple-900 p-3 rounded border border-purple-700 cursor-pointer hover:bg-purple-700 transition'>
                                <div>
                                    <p className='font-bold text-white text-sm'>{u.userName}</p>
                                    <p className='text-xs text-purple-400 font-mono'>{u.shortId} | {u.email}</p>
                                </div>
                                <div className='font-bold text-yellow-400'>{formatNumber(u.points)}</div>
                            </div>
                        ))}
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
            if (docSnap.exists()) setConfig(docSnap.data());
            else setConfig(defaultGlobalConfig);
        };
        fetchConfig();
    }, [db]);

    useEffect(() => {
        if(activeTab === 'CAMPAIGNS') {
            const q = query(getCampaignsCollectionRef());
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
        try { await updateDoc(doc(getCampaignsCollectionRef(), id), { remaining: 0, isActive: false }); } 
        catch(e) {}
    };

    if (!config) return <Loading />;

    return (
        <div className="min-h-screen bg-purple-950 pb-16 pt-20">
            <Header title="ADMIN PANEL" onBack={() => setPage('DASHBOARD')} className="bg-purple-900" />
            <main className="p-4">
                <div className="flex space-x-1 mb-4 bg-purple-800 p-1 rounded-lg">
                    {['SETTINGS', 'USERS', 'CAMPAIGNS'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)} 
                            className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${activeTab === tab ? 'bg-teal-600 text-white shadow' : 'text-purple-300 hover:bg-purple-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'SETTINGS' && <AdminSettingsTab config={config} setConfig={setConfig} onSave={handleSaveConfig} />}
                {activeTab === 'USERS' && <AdminUserManagerTab db={db} showNotification={showNotification} />}
                
                {activeTab === 'CAMPAIGNS' && (
                    <div className="space-y-2">
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
                                <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 bg-red-900 text-red-200 rounded-full hover:bg-red-800"><Trash2 size={18}/></button>
                            </div>
                        ))}
                         {campaigns.length === 0 && <p className="text-purple-300 text-center opacity-50">No campaigns found.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

// ... (User Pages) ...

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
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title="ណែនាំមិត្ត" onBack={() => setPage('DASHBOARD')} />
            <main className="p-4 space-y-4">
                <Card className="p-6 text-center bg-purple-800 border-2 border-yellow-500/50">
                    <h3 className="font-bold text-white text-lg">កូដណែនាំរបស់អ្នក</h3>
                    <div className="text-4xl font-mono font-extrabold text-yellow-400 my-4 tracking-widest bg-purple-900 p-2 rounded-lg shadow-inner">{shortId}</div>
                    <p className="text-sm text-purple-200 font-medium">ទទួលបាន <span className='text-green-400 font-bold'>{formatNumber(globalConfig.referrerReward)} ពិន្ទុ!</span> ក្នុងម្នាក់</p>
                    <button onClick={() => {navigator.clipboard.writeText(shortId); showNotification('ចម្លងរួចរាល់!', 'success')}} className="mt-5 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center justify-center mx-auto shadow-lg active:scale-95 transition">
                        <Copy className='w-4 h-4 mr-2'/> ចម្លងកូដ
                    </button>
                </Card>
                <Card className="p-4">
                    <h3 className="font-bold mb-4 text-white border-b border-purple-600 pb-2">បញ្ជីអ្នកដែលបានណែនាំ ({referrals.length})</h3>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {referrals.length > 0 ? referrals.map((r, i) => (
                            <div key={i} className="flex justify-between items-center bg-purple-700 p-3 rounded-lg border border-purple-600">
                                <span className="text-white font-semibold">{i+1}. {r.referredName || 'User'}</span>
                                <span className="text-green-400 font-bold">+{formatNumber(r.reward)}</span>
                            </div>
                        )) : <div className="text-center py-8 text-purple-400">មិនទាន់មានការណែនាំ</div>}
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

    const getEmbedUrl = (url) => {
        if (url.includes('youtu')) {
             const id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
             return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`; 
        }
        return null;
    }

    const handleCheckLink = (e) => {
        e.preventDefault();
        if(!link.trim()) return showNotification('សូមបញ្ចូល Link ជាមុនសិន', 'error');
        const embed = getEmbedUrl(link);
        if (embed) setPreviewUrl(embed);
        else if(type !== 'view' && type !== 'sub') setPreviewUrl(null);
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
                transaction.set(newCampRef, { userId, type, link: link.trim(), costPerUnit: type === 'sub' ? 50 : 1, requiredDuration: type === 'sub' ? 60 : (parseInt(time) || 60), initialCount: parseInt(count), remaining: parseInt(count), totalCost: cost, createdAt: serverTimestamp(), isActive: true });
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
                        <iframe src={previewUrl} className="w-full h-full" frameBorder="0" allowFullScreen />
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
                                    placeholder="https://youtu.be/..." 
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
                                        <label className="text-white font-bold text-sm">Number of view</label>
                                        <input 
                                            type="number" 
                                            value={count} 
                                            onChange={e => setCount(Math.max(1, parseInt(e.target.value)))} 
                                            className="w-32 p-2 bg-white text-black text-center font-bold rounded-full border-none" 
                                        />
                                    </div>

                                    {type !== 'sub' && (
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-white font-bold text-sm">Time Required (sec.)</label>
                                            <input 
                                                type="number" 
                                                value={time} 
                                                onChange={e => setTime(Math.max(10, parseInt(e.target.value)))} 
                                                className="w-32 p-2 bg-white text-black text-center font-bold rounded-full border-none" 
                                            />
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
            </main>
        </div>
    );
};

const EarnPage = ({ db, userId, type, setPage, showNotification, globalConfig }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [current, setCurrent] = useState(null);
    const [timer, setTimer] = useState(0);
    const [claimed, setClaimed] = useState(false);
    const [autoPlay, setAutoPlay] = useState(true);

    useEffect(() => {
        const q = query(getCampaignsCollectionRef(), where('type', '==', type));
        return onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.userId !== userId && c.remaining > 0);
            setCampaigns(list);
            if (!current && list.length > 0) setCurrent(list[0]);
        });
    }, [db, userId, type, current]);

    useEffect(() => { if (current) { setTimer(current.requiredDuration || 30); setClaimed(false); } }, [current]);
    
    // AUTO CLAIM LOGIC (Only for 'view' and 'website')
    useEffect(() => { 
        if (timer > 0) { 
            const interval = setInterval(() => setTimer(t => t - 1), 1000); 
            return () => clearInterval(interval); 
        } else if (timer === 0 && !claimed && current) {
            // If it's NOT subscription, auto claim
            if (type !== 'sub') {
                handleClaim();
            }
        }
    }, [timer, claimed, current, type]);

    const handleClaim = async () => {
        if (claimed) return;
        setClaimed(true);
        try {
            await runTransaction(db, async (transaction) => {
                const campRef = doc(getCampaignsCollectionRef(), current.id);
                const campDoc = await transaction.get(campRef);
                if (!campDoc.exists() || campDoc.data().remaining <= 0) throw new Error("Campaign finished");
                transaction.update(getProfileDocRef(userId), { points: increment(current.requiredDuration || 50) });
                transaction.update(campRef, { remaining: increment(-1) });
            });
            showNotification('Success! Points Added.', 'success');
            
            // For website, open link if not already (Subscribe handles this separately)
            if (type === 'website') window.open(current.link, '_blank');
            
            // Auto Next
            setTimeout(() => {
                const next = campaigns.filter(c => c.id !== current?.id && c.remaining > 0)[0];
                setCurrent(next || null);
            }, 1500);

        } catch (e) { showNotification('បរាជ័យ: ' + e.message, 'error'); }
    };

    const handleNext = () => {
         const next = campaigns.filter(c => c.id !== current?.id && c.remaining > 0)[0];
         setCurrent(next || null);
    }

    // Special handler for Subscription Button
    const handleSubscribeClick = () => {
        if(!current) return;
        window.open(current.link, '_blank'); // Open channel
        handleClaim(); // Then claim and skip
    };

    const getEmbedUrl = (link) => {
        if (link.includes('youtu')) {
             const id = link.split('v=')[1]?.split('&')[0] || link.split('/').pop();
             return `https://www.youtube.com/embed/${id}?autoplay=1&mute=0&controls=0`; 
        }
        return link;
    }

    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
            <Header title={type === 'view' ? 'មើលវីដេអូ' : type === 'website' ? 'មើល Website' : 'Subscribe'} onBack={() => setPage('DASHBOARD')} />
            <main className="p-0">
                {current ? (
                    <div className='flex flex-col h-full'>
                        {/* Show Video for View AND Sub types */}
                        {(type === 'view' || type === 'sub') ? (
                            <div className="aspect-video bg-black w-full">
                                <iframe src={getEmbedUrl(current.link)} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                        ) : (
                            <div className="bg-purple-900 h-40 flex items-center justify-center border-b border-purple-700"><Globe className="w-16 h-16 text-purple-400" /></div>
                        )}
                        
                        <div className='p-4 bg-white rounded-t-3xl mt-[-20px] relative z-10 min-h-[50vh]'>
                             <div className="flex justify-between items-center mb-4 px-4">
                                <div className="text-center flex items-center text-xl font-bold text-yellow-500"><Coins className="w-6 h-6 mr-2" /> {current.requiredDuration}</div>
                                <div className="text-center flex items-center text-xl font-bold text-red-500"><Zap className="w-6 h-6 mr-2" /> {timer}s</div>
                            </div>

                            <button onClick={handleNext} className="w-full py-3 mb-3 bg-yellow-600 text-white font-bold rounded-full shadow-md">VIEW ANOTHER</button>
                            
                            <div className="flex justify-center items-center space-x-3 mb-4">
                                <span className="text-gray-600 font-bold">auto play next video</span>
                                <button onClick={() => setAutoPlay(!autoPlay)} className={`w-12 h-6 rounded-full p-1 transition ${autoPlay ? 'bg-teal-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition transform ${autoPlay ? 'translate-x-6' : ''}`}></div>
                                </button>
                            </div>

                            {/* MOCK AD BANNER */}
                            <div className="w-full bg-gray-200 h-20 flex flex-col items-center justify-center mb-4 border border-gray-400 rounded">
                                <p className="text-xs text-gray-500 font-bold">SPONSORED AD</p>
                                <p className="text-xs text-gray-400">{globalConfig.adsSettings?.bannerId || 'Banner Ad Space'}</p>
                            </div>

                            {/* Logic for Buttons based on Type */}
                            {type === 'sub' && timer === 0 && !claimed ? (
                                <button onClick={handleSubscribeClick} className="w-full py-3 rounded-full font-bold text-white shadow-lg mb-4 bg-red-600 animate-bounce">
                                    SUBSCRIBE & CLAIM
                                </button>
                            ) : (
                                <button onClick={handleClaim} disabled={timer > 0 || claimed} className={`w-full py-3 rounded-full font-bold text-white shadow-lg mb-4 ${timer > 0 || claimed ? 'bg-gray-400' : 'bg-green-500'}`}>
                                    {timer > 0 ? `Please wait ${timer}s` : 'CLAIM REWARD'}
                                </button>
                            )}
                            
                            <button className="w-full py-3 bg-teal-500 text-white font-bold rounded-full shadow-md">WATCH VIDEO ADS</button>
                        </div>
                    </div>
                ) : <div className="text-white text-center mt-20 text-xl">មិនមានយុទ្ធនាការទេ</div>}
            </main>
        </div>
    );
};

const BuyCoinsPage = ({ db, userId, setPage, showNotification, globalConfig }) => {
    const handlePurchase = async (pkg) => {
        try {
            await runTransaction(db, async (tx) => { tx.update(getProfileDocRef(userId), { points: increment(pkg.coins) }); });
            showNotification(`ទិញបានជោគជ័យ! +${formatNumber(pkg.coins)} coins`, 'success');
        } catch (error) { showNotification(`បរាជ័យ: ${error.message}`, 'error'); }
    };
    return (
        <div className="min-h-screen bg-purple-900 pb-16 pt-20">
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
    <div className="min-h-screen bg-purple-900 pb-16 pt-20">
        <Header title="MY BALANCE" onBack={() => setPage('DASHBOARD')} />
        <main className="p-4 space-y-4">
            <Card className="bg-gradient-to-r from-purple-600 to-purple-800 text-center p-6 text-white border-none">
                <p className="text-sm opacity-80">សមតុល្យបច្ចុប្បន្ន</p>
                <div className="flex justify-center items-center mt-2"><Coins className="w-8 h-8 text-yellow-400 mr-2" /><span className="text-4xl font-extrabold">{formatNumber(userProfile.points)}</span></div>
            </Card>
             <div className="text-center text-purple-300 mt-10 opacity-50">ប្រវត្តិប្រតិបត្តិការនឹងបង្ហាញនៅទីនេះ</div>
        </main>
    </div>
);

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
        if (timer > 0) { const interval = setInterval(() => setTimer(t => t - 1), 1000); return () => clearInterval(interval); } 
        else setFinished(true);
    }, [timer]);

    const claimReward = async () => {
        if (adsWatched >= maxDaily) return showNotification('អស់សិទ្ធិមើលសម្រាប់ថ្ងៃនេះហើយ!', 'error');
        try {
            await runTransaction(db, async (tx) => { 
                const dailyRef = getDailyStatusDocRef(userId);
                tx.update(getProfileDocRef(userId), { points: increment(reward) });
                tx.set(dailyRef, { adsWatchedCount: increment(1), date: getTodayDateKey() }, { merge: true });
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

// --- AUTH COMPONENT (REGISTER FORM UPDATED) ---
const AuthForm = ({ onSubmit, btnText, isRegister = false }) => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [username, setUsername] = useState('');
    const [referralCode, setReferralCode] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(email, pass, username, referralCode);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             {isRegister && (
                 <div className="relative">
                    <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="ឈ្មោះ (Username)" value={username} onChange={e => setUsername(e.target.value)} required className="w-full p-3 pl-10 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400" />
                </div>
            )}
            <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="email" placeholder="អ៊ីមែល (Email)" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 pl-10 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400" />
            </div>
            <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="password" placeholder="ពាក្យសម្ងាត់ (Password)" value={pass} onChange={e => setPass(e.target.value)} required className="w-full p-3 pl-10 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400" />
            </div>
             {isRegister && (
                 <div className="relative">
                    <UserPlus className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="កូដអ្នកណែនាំ (Optional)" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} maxLength={6} className="w-full p-3 pl-10 border border-purple-600 rounded bg-purple-700 text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400 uppercase" />
                </div>
            )}
            <button className="w-full bg-teal-500 text-white p-3 rounded font-bold hover:bg-teal-600 transition shadow-lg">{btnText}</button>
        </form>
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

    const ADMIN_EMAIL = "admin@gmail.com";
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

    const handleRegister = async (email, password, username, referralCode) => {
        if (password.length < 6) return showNotification('Password must be 6+ chars', 'error');
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;
            const shortId = getShortId(uid);
            
            let bonusPoints = 5000;
            let referrerId = null;

            // Process Referral Code
            if (referralCode && referralCode.length === 6) {
                try {
                    const shortDoc = await getDoc(getShortCodeDocRef(referralCode));
                    if (shortDoc.exists()) {
                        referrerId = shortDoc.data().fullUserId;
                        // Give bonus to referrer immediately (optional, or do it later)
                        updateDoc(getProfileDocRef(referrerId), { points: increment(globalConfig.referrerReward) });
                        // Increase bonus for new user
                        bonusPoints += (globalConfig.referredBonus || 0);
                    }
                } catch(e) { console.error("Referral error", e); }
            }

            await setDoc(getProfileDocRef(uid), { 
                userId: uid, 
                email, 
                userName: username || `User_${shortId}`, 
                points: bonusPoints, 
                shortId, 
                createdAt: serverTimestamp(), 
                referredBy: referrerId ? referralCode : null 
            });
            
            await setDoc(getShortCodeDocRef(shortId), { fullUserId: uid, shortId });
            showNotification('ចុះឈ្មោះជោគជ័យ!', 'success');

        } catch (e) { showNotification('បរាជ័យ: ' + e.code, 'error'); }
    };

    const handleLogout = async () => { await signOut(auth); showNotification('បានចាកចេញ', 'success'); };

    const handleDailyCheckin = async () => {
        // Check local status immediately to prevent multiple clicks
        if (userProfile.dailyCheckin) {
             showNotification('បាន Check-in រួចហើយ!', 'info');
             return;
        }

        try {
            await runTransaction(db, async (tx) => {
                // Read inside transaction for consistency
                const dailyRef = getDailyStatusDocRef(userId);
                const dailyDoc = await tx.get(dailyRef);
                
                if (dailyDoc.exists() && dailyDoc.data().checkinDone) {
                    throw new Error("Already checked in today");
                }

                tx.update(getProfileDocRef(userId), { points: increment(globalConfig.dailyCheckinReward) });
                tx.set(dailyRef, { checkinDone: true, date: getTodayDateKey() }, { merge: true });
            });
            showNotification('Check-in ជោគជ័យ!', 'success');
        } catch (e) { 
            console.error(e); 
            // Only show error if it wasn't the "already checked in" one, or just show info
            if (e.message === "Already checked in today") {
                showNotification('បាន Check-in រួចហើយ!', 'info');
            }
        }
    };

    if (!isAuthReady) return <Loading />;

    if (!userId) return (
        <div className="min-h-screen bg-purple-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-6">
                <h2 className="text-2xl font-bold text-center mb-6 text-white">{authPage === 'LOGIN' ? 'ចូលគណនី' : 'បង្កើតគណនី'}</h2>
                <AuthForm 
                    onSubmit={authPage === 'LOGIN' ? handleLogin : handleRegister} 
                    btnText={authPage === 'LOGIN' ? 'ចូល' : 'ចុះឈ្មោះ'} 
                    isRegister={authPage === 'REGISTER'}
                />
                <div className="text-center mt-6">
                    <button onClick={() => setAuthPage(authPage === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-teal-400 underline hover:text-teal-300">
                        {authPage === 'LOGIN' ? 'មិនទាន់មានគណនី? ចុះឈ្មោះ' : 'មានគណនីហើយ? ចូល'}
                    </button>
                </div>
            </Card>
            {notification && <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-2 rounded text-white bg-red-500`}>{notification.message}</div>}
        </div>
    );

    let Content;
    switch (page) {
        case 'EARN_POINTS': Content = <EarnPage db={db} userId={userId} type="view" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_WEBSITE': Content = <EarnPage db={db} userId={userId} type="website" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'EXPLORE_SUBSCRIPTION': Content = <EarnPage db={db} userId={userId} type="sub" setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_CAMPAIGNS': Content = <MyCampaignsPage db={db} userId={userId} userProfile={userProfile} setPage={setPage} showNotification={showNotification} />; break;
        case 'REFERRAL_PAGE': Content = <ReferralPage db={db} userId={userId} showNotification={showNotification} setPage={setPage} globalConfig={globalConfig} />; break;
        case 'BUY_COINS': Content = <BuyCoinsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'BALANCE_DETAILS': Content = <BalanceDetailsPage setPage={setPage} userProfile={userProfile} />; break;
        case 'WATCH_ADS': Content = <WatchAdsPage db={db} userId={userId} setPage={setPage} showNotification={showNotification} globalConfig={globalConfig} />; break;
        case 'MY_PLAN': Content = <MyPlanPage setPage={setPage} />; break;
        case 'ADMIN_DASHBOARD': Content = <AdminDashboardPage db={db} setPage={setPage} showNotification={showNotification} />; break;
        default:
            Content = (
                <div className="min-h-screen bg-purple-900 pb-16 pt-20">
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
                                disabled={userProfile.dailyCheckin}
                            />
                            {/* MODIFIED: SUBSCRIBE BUTTON (Replaces My Plan) */}
                            <IconButton icon={UserCheck} title="SUBSCRIBE" onClick={() => setPage('EXPLORE_SUBSCRIPTION')} iconColor="text-pink-400" />
                            <IconButton icon={Film} title="PLAY VIDEO" onClick={() => setPage('EARN_POINTS')} iconColor="text-red-400" />
                            <IconButton icon={Wallet} title="MY BALANCE" onClick={() => setPage('BALANCE_DETAILS')} iconColor="text-orange-400" />
                            <IconButton icon={ShoppingCart} title="BUY COINS" onClick={() => setPage('BUY_COINS')} iconColor="text-purple-400" />
                            <IconButton icon={Target} title="CAMPAIGNS" onClick={() => setPage('MY_CAMPAIGNS')} iconColor="text-teal-400" />
                            <IconButton icon={UserPlus} title="ណែនាំមិត្ត" onClick={() => setPage('REFERRAL_PAGE')} iconColor="text-blue-400" />
                            <IconButton icon={Globe} title="មើល WEBSITE" onClick={() => setPage('EXPLORE_WEBSITE')} iconColor="text-indigo-400" />
                            <IconButton icon={MonitorPlay} title="មើល ADS" onClick={() => setPage('WATCH_ADS')} iconColor="text-pink-400" />
                        </Card>
                    </div>

                    {/* DASHBOARD BOTTOM AD */}
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
