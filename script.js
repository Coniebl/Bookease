/* script.js - Supabase-powered BookEase client */

function showInlineMessage(el, text, isError = true) {
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  el.classList.toggle('is-success', !isError);
  if (!el.classList.contains('error-message')) {
    el.style.color = isError ? '#b91c1c' : '#166534';
  }
}

function clearInlineMessage(el) {
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
  el.classList.remove('is-success');
}

function formatMessageDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  const isLoginPage = document.body.classList.contains('page-login');
  const requiresAuth = document.body.dataset.requiresAuth === 'true';

  // Expose showForm on login page even before checking auth
  const loginBoxes = document.querySelectorAll('.form-box');
  if (loginBoxes.length > 0) {
    window.showForm = function (formId) {
      loginBoxes.forEach((box) => box.classList.remove('active'));
      const targetForm = document.getElementById(formId);
      if (targetForm) targetForm.classList.add('active');
    };
  }

  // Guard if Supabase keys have not been pasted into supabaseClient.js yet
  if (!window.isSupabaseConfigured || !supabase) {
    const loginMsg = document.getElementById('login-message');
    const configWarning =
      'Supabase is not configured yet. Add your Project URL and anon key in supabaseClient.js.';
    if (isLoginPage && loginMsg) {
      showInlineMessage(loginMsg, configWarning, true);
    } else if (requiresAuth) {
      alert(configWarning);
      window.location.replace('./index.html');
    }
    return;
  }

  // Check current Supabase session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // Redirect rules
  if (requiresAuth && !user) {
    window.location.replace('./index.html');
    return;
  }

  if (isLoginPage && user) {
    window.location.replace('./home.html');
    return;
  }

  // Block nav links on the login page when not logged in
  if (isLoginPage && !user) {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Please log in first.');
      });
    });
  }

  // Logout handler on protected pages
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.replace('./index.html');
    });
  }

  // ---------------------------------------------------------------------------
  // 1. Login & Sign Up Page (index.html)
  // ---------------------------------------------------------------------------
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginMessage = document.getElementById('login-message');
  const signupMessage = document.getElementById('signup-message');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearInlineMessage(loginMessage);

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        showInlineMessage(loginMessage, 'Email and password are required!');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (submitBtn) submitBtn.disabled = false;

      if (error) {
        showInlineMessage(loginMessage, error.message || 'Invalid email or password!');
        return;
      }

      window.location.href = './home.html';
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearInlineMessage(signupMessage);

      const firstName = document.getElementById('signup-first-name').value.trim();
      const lastName = document.getElementById('signup-last-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;

      if (!firstName || !lastName || !email || !password) {
        showInlineMessage(signupMessage, 'Please fill in all fields.');
        return;
      }

      const fullName = `${firstName} ${lastName}`.trim();
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
          },
        },
      });

      if (error) {
        if (submitBtn) submitBtn.disabled = false;
        showInlineMessage(signupMessage, error.message || 'Signup failed, please try again.');
        return;
      }

      // Sign out any auto-created session so the user logs in explicitly
      if (data.session) {
        await supabase.auth.signOut();
      }

      if (submitBtn) submitBtn.disabled = false;

      signupForm.reset();
      window.showForm('login-box');

      const loginEmailInput = document.getElementById('login-email');
      if (loginEmailInput) loginEmailInput.value = email;

      showInlineMessage(
        loginMessage,
        'Account created! Please log in to continue.',
        false
      );
    });
  }

  // Stop here if no authenticated user (e.g., login page)
  if (!user) return;

  const userEmail = user.email || '';
  const fallbackName = userEmail.includes('@') ? userEmail.split('@')[0] : 'Guest';
  const metaFirstName = user.user_metadata?.first_name?.trim() || '';
  const metaLastName = user.user_metadata?.last_name?.trim() || '';
  const metaFullName =
    user.user_metadata?.full_name?.trim() ||
    `${metaFirstName} ${metaLastName}`.trim();
  const displayName = metaFirstName || fallbackName;
  const fullName = metaFullName || fallbackName;

  // ---------------------------------------------------------------------------
  // 2. Home Page (home.html)
  // ---------------------------------------------------------------------------
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay) {
    usernameDisplay.textContent = displayName;
  }

  // ---------------------------------------------------------------------------
  // 3. Services Page (services.html) - Create Booking
  // ---------------------------------------------------------------------------
  const cardBookButtons = document.querySelectorAll('.service-card .book-now-btn');
  const popup = document.getElementById('popup');
  const bookingForm = document.getElementById('hotel-booking-form');
  const paxNameInput = document.getElementById('pax_name');
  const paxEmailInput = document.getElementById('pax_email');

  if (paxEmailInput && !paxEmailInput.value) {
    paxEmailInput.value = userEmail;
  }
  if (paxNameInput && !paxNameInput.value && metaFullName) {
    paxNameInput.value = metaFullName;
  }

  if (cardBookButtons.length > 0 && popup) {
    const formContainer = document.getElementById('booking-form-container');
    const successMsg = document.getElementById('success-message');

    cardBookButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        popup.style.display = 'flex';
        if (formContainer) formContainer.style.display = 'block';
        if (successMsg) successMsg.style.display = 'none';
        if (paxEmailInput) paxEmailInput.value = userEmail;
        if (paxNameInput && metaFullName && !paxNameInput.value) {
          paxNameInput.value = metaFullName;
        }
      });
    });

    const closeBtn = document.getElementById('closePopup');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
      });
    }

    const successOkBtn = document.getElementById('successOkBtn');
    if (successOkBtn) {
      successOkBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        if (bookingForm) bookingForm.reset();
        if (paxEmailInput) paxEmailInput.value = userEmail;
      });
    }

    if (bookingForm) {
      bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('pax_name').value.trim();
        const number_pax = Number.parseInt(document.getElementById('pax_count').value, 10);
        const booking_date = document.getElementById('booked_dates').value;
        const email = document.getElementById('pax_email').value.trim();
        const contact_number = document.getElementById('pax_phone').value.trim();

        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        const { error } = await supabase.from('bookings').insert([
          {
            user_id: user.id,
            name,
            number_pax,
            booking_date,
            email,
            contact_number,
          },
        ]);

        if (submitBtn) submitBtn.disabled = false;

        if (error) {
          console.error('Booking insert error:', error);
          alert('Database Error: ' + error.message);
          return;
        }

        if (formContainer) formContainer.style.display = 'none';
        if (successMsg) successMsg.style.display = 'block';
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. My Bookings Page (my_bookings.html) - Read, Update, Delete
  // ---------------------------------------------------------------------------
  const bookingsTbody = document.getElementById('bookings-tbody');
  const editPopup = document.getElementById('editPopup');
  const editForm = document.getElementById('edit-booking-form');

  async function loadBookings() {
    if (!bookingsTbody) return;

    const { data, error } = await supabase
      .from('bookings')
      .select('id, name, number_pax, booking_date, email, contact_number')
      .order('booking_date', { ascending: false });

    bookingsTbody.textContent = '';

    if (error) {
      console.error('Error loading bookings:', error);
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.textAlign = 'center';
      td.textContent = 'Failed to load bookings: ' + error.message;
      tr.appendChild(td);
      bookingsTbody.appendChild(tr);
      return;
    }

    if (!data || data.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.textAlign = 'center';
      td.textContent = 'No bookings found.';
      tr.appendChild(td);
      bookingsTbody.appendChild(tr);
      return;
    }

    data.forEach((row) => {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.dataset.label = 'Full Name';
      nameTd.textContent = row.name;

      const paxTd = document.createElement('td');
      paxTd.dataset.label = 'Pax';
      paxTd.textContent = String(row.number_pax);

      const dateTd = document.createElement('td');
      dateTd.dataset.label = 'Date';
      dateTd.textContent = row.booking_date;

      const phoneTd = document.createElement('td');
      phoneTd.dataset.label = 'Contact';
      phoneTd.textContent = row.contact_number;

      const actionTd = document.createElement('td');
      actionTd.dataset.label = 'Action';

      const actionWrap = document.createElement('div');
      actionWrap.className = 'action-buttons';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        document.getElementById('edit_id').value = row.id;
        document.getElementById('edit_name').value = row.name;
        document.getElementById('edit_pax').value = row.number_pax;
        document.getElementById('edit_date').value = row.booking_date;
        document.getElementById('edit_phone').value = row.contact_number;
        if (editPopup) editPopup.style.display = 'flex';
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'cancel-booking-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
          return;
        }

        const { error: deleteError } = await supabase
          .from('bookings')
          .delete()
          .eq('id', row.id);

        if (deleteError) {
          alert('Error: ' + deleteError.message);
          return;
        }

        alert('Booking cancelled successfully.');
        await loadBookings();
      });

      actionWrap.appendChild(editBtn);
      actionWrap.appendChild(cancelBtn);
      actionTd.appendChild(actionWrap);

      tr.appendChild(nameTd);
      tr.appendChild(paxTd);
      tr.appendChild(dateTd);
      tr.appendChild(phoneTd);
      tr.appendChild(actionTd);

      bookingsTbody.appendChild(tr);
    });
  }

  if (bookingsTbody) {
    await loadBookings();

    const closeEditBtn = document.getElementById('closeEditPopup');
    if (closeEditBtn && editPopup) {
      closeEditBtn.addEventListener('click', () => {
        editPopup.style.display = 'none';
      });
    }

    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit_id').value;
        const name = document.getElementById('edit_name').value.trim();
        const number_pax = Number.parseInt(document.getElementById('edit_pax').value, 10);
        const booking_date = document.getElementById('edit_date').value;
        const contact_number = document.getElementById('edit_phone').value.trim();

        const submitBtn = editForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        const { error } = await supabase
          .from('bookings')
          .update({ name, number_pax, booking_date, contact_number })
          .eq('id', id);

        if (submitBtn) submitBtn.disabled = false;

        if (error) {
          alert('Error: ' + error.message);
          return;
        }

        alert('Booking updated successfully!');
        if (editPopup) editPopup.style.display = 'none';
        await loadBookings();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Contact Page (contact.html) - Support Chat History & Send Message
  // ---------------------------------------------------------------------------
  const messageHistory = document.getElementById('message-history');
  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-status');

  async function loadMessages() {
    if (!messageHistory) return;

    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('id, name, message, created_at')
        .order('created_at', { ascending: true });

      messageHistory.textContent = '';

      if (error) {
        console.error('Error loading messages:', error);
        const p = document.createElement('p');
        p.className = 'empty-chat';
        p.textContent = 'Could not load messages: ' + error.message;
        messageHistory.appendChild(p);
        return;
      }

      if (!data || data.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty-chat';
        p.textContent = 'No messages yet. Say hello!';
        messageHistory.appendChild(p);
        return;
      }

      data.forEach((msg) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'discord-message';

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        const img = document.createElement('img');
        img.src = './assets/user.png';
        img.alt = 'User';
        avatar.appendChild(img);

        const content = document.createElement('div');
        content.className = 'msg-content';

        const info = document.createElement('div');
        info.className = 'msg-info';

        const authorSpan = document.createElement('span');
        authorSpan.className = 'msg-author';
        authorSpan.textContent = msg.name;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'msg-date';
        dateSpan.textContent = formatMessageDate(msg.created_at);

        info.appendChild(authorSpan);
        info.appendChild(dateSpan);

        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.style.whiteSpace = 'pre-wrap';
        textDiv.textContent = msg.message;

        content.appendChild(info);
        content.appendChild(textDiv);

        wrapper.appendChild(avatar);
        wrapper.appendChild(content);

        messageHistory.appendChild(wrapper);
      });

      messageHistory.scrollTop = messageHistory.scrollHeight;
    } catch (err) {
      console.error('Unexpected error loading messages:', err);
      messageHistory.textContent = '';
      const p = document.createElement('p');
      p.className = 'empty-chat';
      p.textContent = 'Could not load messages: ' + (err.message || 'Unknown error');
      messageHistory.appendChild(p);
    }
  }

  if (contactForm) {
    const messageInput = document.getElementById('contact-message');

    // Allow pressing Enter (without Shift) to submit
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          contactForm.requestSubmit();
        }
      });
    }

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearInlineMessage(contactStatus);

      const message = messageInput ? messageInput.value.trim() : '';

      if (!message) {
        showInlineMessage(contactStatus, 'Please fill in your message.', true);
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const { error } = await supabase.from('contact_messages').insert([
          {
            user_id: user.id,
            name: fullName,
            email: userEmail,
            message,
          },
        ]);

        if (error) {
          console.error('Error sending message:', error);
          showInlineMessage(contactStatus, 'Could not send message: ' + error.message, true);
          return;
        }

        if (messageInput) messageInput.value = '';
        showInlineMessage(contactStatus, 'Message sent! We will get back to you soon.', false);
        await loadMessages();
      } catch (err) {
        console.error('Unexpected error sending message:', err);
        showInlineMessage(contactStatus, 'Could not send message: ' + (err.message || 'Unknown error'), true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (messageHistory) {
    await loadMessages();
  }
});
