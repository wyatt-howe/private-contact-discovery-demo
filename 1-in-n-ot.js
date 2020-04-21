var listeners = {};
var mailbox = {};
const socket = {
  get: function (tag, party_id) {
    console.log('get', tag);
    return new Promise(function (resolve) {
      // tag = party_id + ':' + tag;
      if (mailbox[tag] == null) {
        listeners[tag] = resolve;
      } else {
        console.log('resolved', tag);
        resolve(mailbox[tag]);
        mailbox[tag] = undefined;
      }
    });
  },
  give: function (tag, msg, party_id) {
    console.log('give', tag, msg);
    // tag = party_id + ':' + tag;
    if (listeners[tag] == null) {
      mailbox[tag] = msg;
    } else {
      console.log('resolved', tag, msg);
      listeners[tag](msg);
      listeners[tag] = undefined;
    }
  }
};


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
  console.log(plaintext, key, hash(key), plaintext ^ hash(key));
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
  send: function (tag, m0, m1) {
    const _id = 0;

    const a = rsa.random();
    const A = rsa.exp_base(a);

    socket.give('A', A, _id);
    socket.get('B', _id).then(function (B) {
      let k0 = rsa.exp(B, a);
      let k1 = rsa.exp(rsa.sub(B, A), a);

      k0 = rsa.hash(k0);
      k1 = rsa.hash(k1);
      console.log('k', k0, k1);

      const e0 = encrypt_generic(m0, k0,);
      const e1 = encrypt_generic(m1, k1);

      socket.give('e', [e0, e1], _id);
    });
  },

  receive: function (tag, c) {
    const _id = 0;

    const b = rsa.random();
    let B = rsa.exp_base(b);

    return new Promise(function (resolve) {
      socket.get('A', _id).then(function (A) {
        if (c === 1) {
          B = rsa.add(A, B);
        }

        socket.give('B', B, _id);
        socket.get('e', _id).then(function (e) {
          e = e[c];

          let k = rsa.exp(A, b);
          k = rsa.hash(k);
          console.log('k', k);

          resolve(decrypt_generic(e, k));
        });
      });
    });
  }
};

OT.send('test', 6666666666, 555555555);
OT.receive('test', 1).then(console.log);
