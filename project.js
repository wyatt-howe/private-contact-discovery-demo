var listeners = {};
var mailbox = {};
const socket = party_id => ({
  get: function (tag) {
    return new Promise(function (resolve) {
      tag = party_id + ':' + tag;
      // console.log('get', tag);
      if (mailbox[tag] == null) {
        listeners[tag] = resolve;
      } else {
        // console.log('resolved', tag);
        resolve(mailbox[tag]);
        mailbox[tag] = undefined;
      }
    });
  },
  give: function (tag, msg) {
    tag = party_id + ':' + tag;
    // console.log('give', tag, msg);
    if (listeners[tag] == null) {
      mailbox[tag] = msg;
    } else {
      // console.log('resolved', tag, msg);
      listeners[tag](msg);
      listeners[tag] = undefined;
    }
  },
  listen: function (get, tag, callback) {
    (function register(f) {
      get(tag).then(function (msg) {
        f(msg);
        register(f);
      });
    }(callback));
  }
});


const hash = function (m) {
    m = String(m) + "!!!";
    var hash = 0;
    if (m.length == 0) {
        return hash;
    }
    for (var i = 0; i < m.length; i++) {
        var char = m.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash;  // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

function encrypt_generic(plaintext, key) {
  // console.log(plaintext, key, hash(key), plaintext ^ hash(key));
  return plaintext ^ hash(key);
}
let decrypt_generic = encrypt_generic;

const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);

const egcd = function (a, b) {
  if (a % b === 0) {
    return {d: b, s: 0, t: 1};
  } else {
    let q = Math.floor(a / b);
    let r = a % b;
    let gcd = egcd(b, r);
    let d = gcd.d;
    let s = gcd.s;
    let t = gcd.t;
    return {
      d: d,
      s: t,
      t: s - (t * q)
    };
  }
};

const rsa = {
  p: 101,
  g: 99,
  random: function () {
    return Math.floor(Math.random() * (rsa.p - 1)) + 1;
  },
  add: function (a, b) {
    return (a * b) % rsa.p;
  },
  inv: function (a) {
    return (egcd(a, rsa.p).s + rsa.p) % rsa.p;
  },
  sub: function (a, b) {
    return rsa.add(a, rsa.inv(b)) % rsa.p;
  },
  exp: function (a, b) {
    let c = a;
    for (var i = 1; i < b; i++) {
      c = rsa.add(c, a);
    }
    return c;
  },
  exp_base: function (a) {
    return rsa.exp(rsa.g, a);
  },
  hash: hash
};

const OT = {
  single_send: function (tag, m0, m1) {
    let io = socket(tag);

    const a = rsa.random();
    const A = rsa.exp_base(a);

    io.give('A', A);
    io.get('B').then(function (B) {
      let k0 = rsa.exp(B, a);
      let k1 = rsa.exp(rsa.sub(B, A), a);

      k0 = rsa.hash(k0);
      k1 = rsa.hash(k1);

      const e0 = encrypt_generic(m0, k0,);
      const e1 = encrypt_generic(m1, k1);

      io.give('e', [e0, e1]);
    });
  },

  single_receive: function (tag, c) {
    let io = socket(tag);

    const b = rsa.random();
    let B = rsa.exp_base(b);

    return new Promise(function (resolve) {
      io.get('A').then(function (A) {
        if (c === 1) {
          B = rsa.add(A, B);
        }

        io.give('B', B);
        io.get('e').then(function (e) {
          e = e[c];

          let k = rsa.exp(A, b);
          k = rsa.hash(k);

          resolve(decrypt_generic(e, k));
        });
      });
    });
  },
  send: function (tag, arr) {
    for (var i = 0; i < arr.length; i++) {
      OT.single_send(tag + ':' + i, 0, arr[i]);
    }
  },
  receive: function (tag, index, n) {
    n = n == null ? index + 1 : n;
    return new Promise(function(resolve) {
      for (var i = 0; i < n; i++) {
        if (i === index) {
          OT.single_receive(tag + ':' + i, 1).then(function (result) {
            resolve(result);
          });
        } else {
          OT.single_receive(tag + ':' + i, 0);
        }
      }
    });
  }
};

// OT.send('test', [6666666666, 555555555, 777777777]);
// OT.receive('test', 2, 3).then(console.log);




const server_pki = function (users) {
  console.log('server_pki', users);

  // Server PKI code






};

const client_pki = function (contacts) {
  console.log('client_pki', contacts);

  return new Promise(function(resolve, reject) {
    // Client PKI code
    io.give('discover', contacts);




    resolve([]);
  });
};



// Server Code
(function () {
  // Service database
  let users = [];

  // Handle sign up request
  const register = function (contact) {
    // Add identifiable information of client such as their
    // phone number or legal name to the server's database.
    users.push(contact);
  };

  // Listen for client requests
  let io = socket('server');
  io.listen(io.get, 'register', register);
  io.listen(io.get, 'discover', () => server_pki(users));
}());

// Client Code
let io = socket('server');
const register = id => io.give('register', id);
const discover = contacts => client_pki(contacts);


// Simulate example behavior from multiple clients
setTimeout(function () {
  register('Alice');
  setTimeout(function () {
    register('Bob');
    setTimeout(function () {
      register('Mayank');
      setTimeout(function () {
        register('Wyatt');
        setTimeout(function () {
          discover(['Wyatt', 'Nicolas', 'Alice']).then(console.log);
        }, 1);
      }, 1);
    }, 1);
  }, 1);
}, 1);
