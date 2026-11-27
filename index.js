 const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTQ0fmevto-mto5JkkHV03QLY_Q4PPwkP2uj4vjoymVFBSopIz3F-LsHpXXrVz3dnPnaat93zqMOvG2/pub?gid=399187117&single=true&output=csv';
    
    // CSV danh sách tài khoản đăng ký để tra cứu khi đăng nhập
    const USERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7hTrDz04ql_5kENsVYTYiamfgw0TeoOzFNLy7RsG1l4ikNuWVKT5LMDHBR7Z-1-8J7P9NMy1JCIla/pub?gid=1205337890&single=true&output=csv';

    // Đường dẫn submit Google Form khi đăng ký mới
    const GOOGLE_FORM_ACTION_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSeYF11sRJV8TDD_vQY7nFznsx0COxEOh_jN1SFQAhNRTK6BCQ/formResponse';

    const USER_STORAGE_KEY = 'vibe_registered_user';

    const POPUP_CONFIG = {
      search: { title: 'Tìm kiếm video & xu hướng', url: 'https://vi.m.wikipedia.org/wiki/Trang_Ch%C3%ADnh' },
      explore: { title: 'Khám phá nội dung nổi bật', url: 'https://vi.m.wikipedia.org/wiki/C%E1%BB%95ng_th%C3%B4ng_tin:C%C3%B4ng_ngh%E1%BB%87' },
      upload: { title: 'Đăng tải video mới', url: './upload.html' },
      inbox: { title: 'Hộp thư & Thông báo', url: 'https://vi.m.wikipedia.org/wiki/Tin_nh%E1%BA%AFn' },
      profile: { title: 'Hồ sơ cá nhân của bạn', url: './profile.html' },
      comments: { title: 'Bình luận video', url: 'https://vi.m.wikipedia.org/wiki/B%C3%ACnh_lu%E1%BA%A1n' },
      share: { title: 'Lưu & Chia sẻ liên kết', url: 'https://vi.m.wikipedia.org/wiki/M%E1%BA%A1ng_x%C3%A3_h%E1%BB%99i' },
      live: { title: 'Phòng phát trực tiếp (LIVE)', url: 'https://vi.m.wikipedia.org/wiki/Ph%C3%A1t_tr%E1%BB%B1c_ti%E1%BA%BFp' },
      following: { title: 'Kênh đang theo dõi', url: 'https://vi.m.wikipedia.org/wiki/Danh_s%C3%A1ch' },
      creator: { title: 'Trang cá nhân Tác giả', url: 'https://kimquangtu13112007.blogspot.com/' },
      sound: { title: 'Âm thanh gốc trong video', url: 'https://vi.m.wikipedia.org/wiki/%C3%82m_nh%E1%BA%A1c' }
    };

    let currentUser = null;
    let authMode = 'register'; // 'register' | 'login'

    const authGateOverlay = document.getElementById('authGateOverlay');
    const authForm = document.getElementById('authForm');
    const tabRegister = document.getElementById('tabRegister');
    const tabLogin = document.getElementById('tabLogin');
    const registerFields = document.getElementById('registerFields');
    const loginAccountGroup = document.getElementById('loginAccountGroup');
    const loginAccountInput = document.getElementById('loginAccountInput');
    const authHeading = document.getElementById('authHeading');
    const authSubheading = document.getElementById('authSubheading');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authErrorMsg = document.getElementById('authErrorMsg');
    const logoutBtn = document.getElementById('logoutBtn');

    function setAuthMode(mode) {
      authMode = mode;
      authErrorMsg.classList.add('hidden');
      if (mode === 'register') {
        tabRegister.className = 'py-2 text-xs font-bold rounded-lg bg-white text-gray-900 shadow-xs transition';
        tabLogin.className = 'py-2 text-xs font-semibold rounded-lg text-gray-500 hover:text-gray-900 transition';
        registerFields.classList.remove('hidden');
        loginAccountGroup.classList.add('hidden');
        loginAccountInput.required = false;
        authHeading.textContent = 'Tạo tài khoản mới';
        authSubheading.textContent = 'Đăng ký thành viên để khám phá và tương tác.';
        authSubmitBtn.innerHTML = '<span>Đăng Ký & Bắt Đầu Xem</span>';
        authForm.action = GOOGLE_FORM_ACTION_URL;
      } else {
        tabLogin.className = 'py-2 text-xs font-bold rounded-lg bg-white text-gray-900 shadow-xs transition';
        tabRegister.className = 'py-2 text-xs font-semibold rounded-lg text-gray-500 hover:text-gray-900 transition';
        registerFields.classList.add('hidden');
        loginAccountGroup.classList.remove('hidden');
        loginAccountInput.required = true;
        authHeading.textContent = 'Chào mừng trở lại';
        authSubheading.textContent = 'Đăng nhập bằng Email hoặc Số điện thoại đã đăng ký.';
        authSubmitBtn.innerHTML = '<span>Đăng Nhập</span>';
        authForm.action = '';
      }
    }

    tabRegister.addEventListener('click', () => setAuthMode('register'));
    tabLogin.addEventListener('click', () => setAuthMode('login'));

    authForm.action = GOOGLE_FORM_ACTION_URL;

    function unlockAppForUser(user) {
      currentUser = user;
      authGateOverlay.classList.add('hidden');
      document.getElementById('navProfileLabel').textContent = (user.fullName || 'Hồ sơ').split(' ')[0];
      fetchVideos();
    }

    // Hàm tạo UserID ngẫu nhiên dựa trên thông tin
    function generateUniqueUserId(fullName, email, phone) {
      const rawString = `${fullName}_${email}_${phone}_${Date.now()}`;
      let hash = 0;
      for (let i = 0; i < rawString.length; i++) {
        hash = (hash << 5) - hash + rawString.charCodeAt(i);
        hash |= 0;
      }
      return 'usr_' + Math.abs(hash).toString(36) + Math.random().toString(36).substring(2, 6);
    }

    // Chuẩn hóa số điện thoại
    function normalizePhone(val) {
      const digits = (val || '').replace(/\D/g, '');
      return digits.replace(/^0+/, '');
    }

    // Parse CSV danh sách người dùng từ Google Sheets
    function parseUsersCSV(csvText) {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 2) return [];

      const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
      
      const idxName = headers.findIndex(h => h.includes('tên') || h.includes('name'));
      const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('mail'));
      const idxPhone = headers.findIndex(h => h.includes('thoại') || h.includes('sđt') || h.includes('phone'));
      const idxUid = headers.findIndex(h => h.includes('userid') || h.includes('uid') || h === 'id');
      const idxPass = headers.findIndex(h => h.includes('mật khẩu') || h.includes('password') || h.includes('pass'));

      const users = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
        if (cols.length < 2) continue;

        const fullName = cols[idxName >= 0 ? idxName : 1] || 'Thành viên Vibe';
        const email = cols[idxEmail >= 0 ? idxEmail : 2] || '';
        const phone = cols[idxPhone >= 0 ? idxPhone : 3] || '';
        const userId = cols[idxUid >= 0 ? idxUid : 4] || '';
        const password = cols[idxPass >= 0 ? idxPass : 5] || '';

        if (email || phone) {
          users.push({ fullName, email, phone, userId, password });
        }
      }
      return users;
    }

    authForm.addEventListener('submit', async (e) => {
      authErrorMsg.classList.add('hidden');
      const password = document.getElementById('regPassword').value;

      if (authMode === 'register') {
        const fullName = document.getElementById('regFullName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();

        if (!fullName || !email || !phone || !password) {
          e.preventDefault();
          authErrorMsg.textContent = 'Vui lòng điền đầy đủ Họ tên, Email, Số điện thoại và Mật khẩu.';
          authErrorMsg.classList.remove('hidden');
          return;
        }

        const autoUserId = generateUniqueUserId(fullName, email, phone);
        document.getElementById('regUserId').value = autoUserId;

        const userObj = {
          userId: autoUserId,
          fullName,
          email,
          phone,
          password,
          createdAt: new Date().toISOString()
        };

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
        
        authSubmitBtn.disabled = true;
        authSubmitBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang khởi tạo...</span>`;

        setTimeout(() => {
          authSubmitBtn.disabled = false;
          authSubmitBtn.innerHTML = '<span>Đăng Ký & Bắt Đầu Xem</span>';
          unlockAppForUser(userObj);
        }, 600);

      } else {
        // Chế độ Đăng nhập: Tra cứu email/sđt và mật khẩu từ Google Sheets CSV
        e.preventDefault();
        const accountInput = loginAccountInput.value.trim();

        if (!accountInput || !password) {
          authErrorMsg.textContent = 'Vui lòng nhập email/số điện thoại và mật khẩu.';
          authErrorMsg.classList.remove('hidden');
          return;
        }

        authSubmitBtn.disabled = true;
        authSubmitBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang kiểm tra...</span>`;

        try {
          const res = await fetch(`${USERS_CSV_URL}&t=${Date.now()}`);
          if (!res.ok) throw new Error('Network error');
          const csvText = await res.text();
          const usersList = parseUsersCSV(csvText);

          const inputLower = accountInput.toLowerCase();
          const inputPhoneNorm = normalizePhone(accountInput);

          const matchedUser = usersList.find(u => {
            const emailMatch = u.email && u.email.toLowerCase() === inputLower;
            const phoneMatch = inputPhoneNorm.length >= 6 && normalizePhone(u.phone) === inputPhoneNorm;
            return emailMatch || phoneMatch;
          });

          if (!matchedUser) {
            authErrorMsg.textContent = 'SĐT hoặc email này chưa khởi tạo';
            authErrorMsg.classList.remove('hidden');
          } else if (matchedUser.password !== password) {
            authErrorMsg.textContent = 'Mật khẩu không chính xác. Vui lòng thử lại.';
            authErrorMsg.classList.remove('hidden');
          } else {
            const userObj = {
              userId: matchedUser.userId || generateUniqueUserId(matchedUser.fullName, matchedUser.email, matchedUser.phone),
              fullName: matchedUser.fullName,
              email: matchedUser.email,
              phone: matchedUser.phone,
              password: matchedUser.password,
              loggedInAt: new Date().toISOString()
            };
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
            unlockAppForUser(userObj);
          }
        } catch (err) {
          authErrorMsg.textContent = 'Không thể kết nối máy chủ xác thực. Vui lòng thử lại sau.';
          authErrorMsg.classList.remove('hidden');
        } finally {
          authSubmitBtn.disabled = false;
          authSubmitBtn.innerHTML = '<span>Đăng Nhập</span>';
        }
      }
    });

    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(USER_STORAGE_KEY);
      currentUser = null;
      closeFeaturePopup();
      mainVideo.pause();
      mainVideo.src = '';
      authForm.reset();
      setAuthMode('login');
      authGateOverlay.classList.remove('hidden');
    });

    let videoList = [];
    let historyStack = [];
    let historyIndex = -1;
    let isTransitioning = false;
    let wasPlayingBeforePopup = false;

    const mainVideo = document.getElementById('mainVideo');
    const driveIframe = document.getElementById('driveIframe');
    const videoStage = document.getElementById('videoStage');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const authorHandle = document.getElementById('authorHandle');
    const videoTimestamp = document.getElementById('videoTimestamp');
    const progressBar = document.getElementById('progressBar');
    const prevVideoBtn = document.getElementById('prevVideoBtn');

    const featurePopupOverlay = document.getElementById('featurePopupOverlay');
    const featurePopupSheet = document.getElementById('featurePopupSheet');
    const popupTitle = document.getElementById('popupTitle');
    const popupIframe = document.getElementById('popupIframe');
    const popupIframeLoader = document.getElementById('popupIframeLoader');
    const popupExternalLink = document.getElementById('popupExternalLink');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const popupBackdropClose = document.getElementById('popupBackdropClose');

    function openFeaturePopup(key) {
      if (!currentUser) return;
      const config = POPUP_CONFIG[key] || { title: 'Tính năng', url: 'https://kimquangtu13112007.blogspot.com/' };
      const currentItem = historyStack[historyIndex];

      logoutBtn.classList.toggle('hidden', key !== 'profile');

      let targetUrl = config.url;
      const params = new URLSearchParams();
      params.set('uid', currentUser.userId);
      params.set('name', currentUser.fullName);
      params.set('email', currentUser.email || '');
      params.set('phone', currentUser.phone || '');
      if (currentItem) {
        params.set('author', currentItem.userId);
      }
      const separator = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${separator}${params.toString()}`;

      if (!mainVideo.paused) {
        wasPlayingBeforePopup = true;
        mainVideo.pause();
      } else {
        wasPlayingBeforePopup = false;
      }

      popupTitle.textContent = config.title;
      popupExternalLink.href = targetUrl;
      popupIframeLoader.classList.remove('hidden');
      popupIframe.src = targetUrl;

      featurePopupOverlay.classList.remove('hidden');
      featurePopupSheet.classList.remove('animate-sheet-up');
      void featurePopupSheet.offsetWidth;
      featurePopupSheet.classList.add('animate-sheet-up');
    }

    function closeFeaturePopup() {
      featurePopupOverlay.classList.add('hidden');
      popupIframe.src = 'about:blank';

      if (wasPlayingBeforePopup && !mainVideo.classList.contains('hidden')) {
        mainVideo.play().catch(() => {});
      }
    }

    popupIframe.addEventListener('load', () => {
      popupIframeLoader.classList.add('hidden');
    });

    closePopupBtn.addEventListener('click', closeFeaturePopup);
    popupBackdropClose.addEventListener('click', closeFeaturePopup);
    document.getElementById('homeNavBtn').addEventListener('click', closeFeaturePopup);

    document.querySelectorAll('.popup-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-popup');
        openFeaturePopup(key);
      });
    });

    function extractDriveId(url) {
      if (!url) return null;
      const match = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]{15,})/);
      return match ? match[1] : null;
    }

    function parseCSV(text) {
      const lines = text.trim().split(/\r?\n/);
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
        if (cols.length >= 3 && cols[2]) {
          items.push({ timestamp: cols[0] || '', userId: cols[1] || 'user', rawUrl: cols[2] });
        }
      }
      return items;
    }

    async function fetchVideos() {
      try {
        const res = await fetch(`${CSV_URL}&t=${Date.now()}`);
        const csvText = await res.text();
        videoList = parseCSV(csvText);
        if (videoList.length > 0) {
          loadNextVideo(true);
        } else {
          loadingOverlay.innerHTML = '<p class="text-sm text-white/80">Chưa có video.</p>';
        }
      } catch (err) {
        loadingOverlay.innerHTML = '<p class="text-sm text-rose-400">Lỗi tải dữ liệu.</p>';
      }
    }

    function updateNavButtons() {
      if (historyIndex <= 0) {
        prevVideoBtn.classList.add('hidden');
      } else {
        prevVideoBtn.classList.remove('hidden');
      }
    }

    function loadNextVideo(isInitial = false) {
      if (videoList.length === 0 || isTransitioning) return;
      isTransitioning = true;
      setTimeout(() => { isTransitioning = false; }, 350);

      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        renderCurrentVideo('up', false);
        updateNavButtons();
        return;
      }

      let randomIndex = Math.floor(Math.random() * videoList.length);
      if (videoList.length > 1 && historyStack.length > 0) {
        while (videoList[randomIndex].rawUrl === historyStack[historyStack.length - 1].rawUrl) {
          randomIndex = Math.floor(Math.random() * videoList.length);
        }
      }

      const item = videoList[randomIndex];
      historyStack.push(item);
      historyIndex = historyStack.length - 1;

      renderCurrentVideo('up', isInitial);
      updateNavButtons();
    }

    function loadPreviousVideo() {
      if (historyIndex <= 0 || isTransitioning) return;
      isTransitioning = true;
      setTimeout(() => { isTransitioning = false; }, 350);

      historyIndex--;
      renderCurrentVideo('down', false);
      updateNavButtons();
    }

    function renderCurrentVideo(direction, isInitial) {
      const item = historyStack[historyIndex];
      videoStage.style.transform = '';

      if (!isInitial) {
        videoStage.classList.remove('animate-slide-up', 'animate-slide-down');
        void videoStage.offsetWidth;
        videoStage.classList.add(direction === 'up' ? 'animate-slide-up' : 'animate-slide-down');
      }

      authorHandle.textContent = `@${item.userId}`;
      videoTimestamp.textContent = `Original sound • ${item.timestamp}`;
      progressBar.style.width = '0%';

      const driveId = extractDriveId(item.rawUrl);
      if (driveId) {
        const directStreamUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
        driveIframe.classList.add('hidden');
        driveIframe.src = '';
        mainVideo.classList.remove('hidden');
        mainVideo.src = directStreamUrl;
        
        mainVideo.play().then(() => {
          loadingOverlay.classList.add('hidden');
        }).catch(() => {
          mainVideo.classList.add('hidden');
          driveIframe.classList.remove('hidden');
          driveIframe.src = `https://drive.google.com/file/d/${driveId}/preview`;
          loadingOverlay.classList.add('hidden');
        });
      } else {
        driveIframe.classList.add('hidden');
        driveIframe.src = '';
        mainVideo.classList.remove('hidden');
        mainVideo.src = item.rawUrl;
        mainVideo.play().then(() => {
          loadingOverlay.classList.add('hidden');
        }).catch(() => {
          loadingOverlay.classList.add('hidden');
        });
      }
    }

    mainVideo.addEventListener('timeupdate', () => {
      if (mainVideo.duration) {
        progressBar.style.width = `${(mainVideo.currentTime / mainVideo.duration) * 100}%`;
      }
    });

    const muteToggleBtn = document.getElementById('muteToggleBtn');
    const iconMuted = document.getElementById('iconMuted');
    const iconUnmuted = document.getElementById('iconUnmuted');

    muteToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mainVideo.muted = !mainVideo.muted;
      iconMuted.classList.toggle('hidden', !mainVideo.muted);
      iconUnmuted.classList.toggle('hidden', mainVideo.muted);
    });

    let liked = false;
    document.getElementById('likeBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      liked = !liked;
      const heartIcon = document.getElementById('heartIcon');
      heartIcon.setAttribute('fill', liked ? '#e11d48' : 'none');
      heartIcon.setAttribute('stroke', liked ? '#e11d48' : 'currentColor');
    });

    document.getElementById('nextVideoBtn').addEventListener('click', () => loadNextVideo(false));
    prevVideoBtn.addEventListener('click', () => loadPreviousVideo());

    window.addEventListener('keydown', (e) => {
      if (!currentUser) return;
      if (e.key === 'Escape' && !featurePopupOverlay.classList.contains('hidden')) {
        closeFeaturePopup();
        return;
      }
      if (!featurePopupOverlay.classList.contains('hidden')) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        loadNextVideo(false);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        loadPreviousVideo();
      }
    });

    (function initAuth() {
      const savedRaw = localStorage.getItem(USER_STORAGE_KEY);
      if (savedRaw) {
        try {
          const savedUser = JSON.parse(savedRaw);
          if (savedUser && savedUser.userId) {
            unlockAppForUser(savedUser);
            return;
          }
        } catch (e) {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      authGateOverlay.classList.remove('hidden');
    })();