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

// Hash array of chars
const H = function (m) {
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

const xor_char = (a, b) => (((parseInt(a, 16) ^ parseInt(b, 16)) + 16) % 16).toString(16);

function xor_array(a, b, l) {
  var c = "";
  for (var i = 0; i < a.length; i++) {
    c += xor_char(a[i], b[i]);
  }
  return c;
}

function encrypt_generic(plaintext, key) {
  plaintext = plaintext.toString(16).padStart(16, '0');
  let pad = H(key.toString(16)).toString(16).padStart(16, '0');
  let ciphertext = xor_array(plaintext, pad);
  // console.log('enc', plaintext, key, pad, ciphertext);
  return ciphertext;
}

function decrypt_generic(ciphertext, key) {
  let pad = H(key.toString(16)).toString(16).padStart(16, '0');
  let plaintext = parseInt(xor_array(ciphertext, pad), 16);
  // console.log('dec', ciphertext, key, pad, plaintext);
  return plaintext;
}

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

// Multiplicative group Z*101 of order 100 and with generator g = 99
const G = {
  p: 101,
  g: 99,
  random: function () {
    return Math.floor(Math.random() * (G.p - 1)) + 1;
  },
  add: function (a, b) {
    return (a * b) % G.p;
  },
  inv: function (a) {
    return (egcd(a, G.p).s + G.p) % G.p;
  },
  sub: function (a, b) {
    return G.add(a, G.inv(b)) % G.p;
  },
  exp: function (a, b) {
    let c = a;
    for (var i = 1; i < b; i++) {
      c = G.add(c, a);
    }
    return c;
  },
  exp_base: function (a) {
    return G.exp(G.g, a);
  },
  point_to_hash: function (e) {
    return H(String(e + G.p));
  }
};

const OT = {
  single_send: function (tag, m0, m1) {
    let io = socket(tag);

    const a = G.random();
    const A = G.exp_base(a);

    io.give('A', A);
    io.get('B').then(function (B) {
      let k0 = G.exp(B, a);
      let k1 = G.exp(G.sub(B, A), a);

      k0 = G.point_to_hash(k0);
      k1 = G.point_to_hash(k1);

      const e0 = encrypt_generic(m0, k0);
      const e1 = encrypt_generic(m1, k1);

      io.give('e', [e0, e1]);
    });
  },

  single_receive: function (tag, c) {
    let io = socket(tag);

    const b = G.random();
    let B = G.exp_base(b);

    return new Promise(function (resolve) {
      io.get('A').then(function (A) {
        if (c === 1) {
          B = G.add(A, B);
        }

        io.give('B', B);
        io.get('e').then(function (e) {
          e = e[c];

          let k = G.exp(A, b);
          k = G.point_to_hash(k);

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

// let n = 10000;
// OT.send('test', Array(n).fill(6666666666));
// OT.receive('test', n-1, n).then(console.log);



const random_bytestring = () => Math.floor(Math.random()*Math.pow(2, 48)).toString(16);
const random_number = () => Math.floor(Math.random()*Math.pow(2, 48));

const random_ot = function () {




}










const server_pki = function (io, users, size) {
  console.log('server_pki', users, size);

  // Server PKI code
  let n = 16;  // 1-in-16 OT
  let l = 8;  // hash length in hex
  let random = Array.from(Array(l*n), random_number);

  let y = [];
  for (var i = 0; i < users.length; i++) {
    let hash = H(users[i]).toString(16).padStart(l, '0');
    let s = [];
    for (var j = 0; j < random.length; j += n) {  // loop l times
      let selection = parseInt(hash[j/n], 16);
      s[j/n] = random.slice(j, j+n)[selection]
    }
    y[i] = s[0].toString(16).padStart(12, '0');
    for (var j = 1; j < l; j++) {
      y[i] = xor_array(y[i], s[j].toString(16).padStart(12, '0'));
    }
  }
  y = y.map(H);
  io.give('y', y);

  for (var i = 0; i < size; i++) {
    for (var j = 0; j < random.length; j += n) {  // loop l times
      OT.send('s'+i+'_'+(j/16), random.slice(j, j+n));
    }
  }
};

const client_pki = function (io, contacts) {
  io.give('discover', contacts.length);
  console.log('client_pki', contacts);

  return new Promise(function(resolve) {
    // Client PKI code
    let discovered = [];
    io.get('y').then(function (y) {
      let l = 8;  // hash length in hex
      let hashes = contacts.map(H);
      for (var i = 0; i < hashes.length; i++) {
        let hash = hashes[i].toString(16).padStart(l, '0');
        let promise_s = [];
        for (var j = 0; j < l; j++) {
          let selection = parseInt(hash[j], 16);
          promise_s[j] = OT.receive('s'+i+'_'+j, selection, 16);
        }
        Promise.all(promise_s).then(function (i, s) {
          let x = s[0].toString(16).padStart(12, '0');
          for (var j = 1; j < l; j++) {
            x = xor_array(x, s[j].toString(16).padStart(12, '0'));
          }
          x = H(x);

          if (y.indexOf(x) > -1) {
            discovered.push(contacts[i]);
          }

          if (i === contacts.length - 1) {
            resolve(discovered);
          }
        }.bind(null, i));
      }
    });
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
  io.listen(io.get, 'discover', size => server_pki(io, users, size));
}());

// Client Code
let io = socket('server');
const register = id => io.give('register', id);
const discover = contacts => client_pki(io, contacts);


// Simulate example behavior from multiple clients
setTimeout(function () {
  console.clear();
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
