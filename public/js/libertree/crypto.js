// TODO: weird; after an error happened I get "TypeError: Callbacks is null" until restart.
Libertree.Crypto = (function () {
    "use strict";

    /* a map for functions that don't return their values directly
       but rather pass them to a provided callback */
    /* acc is the accumulated result */
    /* f takes an element x and a callback to which f(x) is passed */
    /* g is the function that should be applied to the accumulator at the end */
    /* xs is an array that the function is to be mapped over */
    function callbackMap(acc, f, g, xs) {
        if (xs.length === 0) {
            return g(acc);
        } else {
            return f(acc, xs.shift(), function (result) {
                return callbackMap(result, f, g, xs);
            });
        }
    }

    function uploadPublicKey(key) {
        $.post(
            '/accounts/upload_key',
            { key: key },
            // TODO: distinguish between success and failure
            function (response) {
                // TODO: display success/error message
                console.log(response);
            });
    }

    /* generate a symmetric key and wrap it in the given public keys */
    /* public_keys must be an array */
    /* callback is a function with two arguments:
       - the encrypted cipher object
       - an array of wrapped keys for each of the public keys */
    function encrypt(plaintext, public_keys, callback) {
        window.mozCipher.sym.generateKey(function (sym) {
            // encrypt with own public key first, then wrap
            // the symmetric key with all recipients' public keys.
            window.mozCipher.sym.encrypt(
                plaintext,
                function (cipherObj) {
                    function wrap(acc, pubkey, cb) {
                        window.mozCipher.sym.wrapKey(
                            cipherObj,
                            pubkey,
                            function (res) {
                                return cb(acc.concat(res));
                            });
                    }
                    function resultHandler(symObjs) {
                        return callback(cipherObj, symObjs);
                    }
                    callbackMap([], wrap, resultHandler, public_keys);
                }
            );
        });
    }

    return {
        supported: (window.mozCipher !== undefined),
        /* TODO: remove this one? */
        uploadPublicKey: function () {
            window.mozCipher.pk.getPublicKey(uploadPublicKey);
        },
        // TODO: this is dangerous. There's only one keypair per browser profile
        generateKeys: function () {
            window.mozCipher.pk.generateKeypair(uploadPublicKey);
        },
        encrypt: encrypt,

        // TODO: how do we restore the cipherObject and place it in the DOM?
        decrypt: function (cipherObj, callback) {
            /* cipherObj has three properties:
                'cipherText', 'iv', and 'wrappedKey'
               Can we create the wrappedKey object from db contents?
            */
            window.mozCipher.pk.decrypt(
                cipherObj,
                function (result) { return callback(result); });
        },

        // TODO
        test: function (username) {
            $.ajax({
                datatype: 'json',
                url: '/accounts/key.json',
                data: {'username': username},
                /* TODO: what to do on failure? */
                success: function (response) {
                    var somekey = response.key;

                    window.mozCipher.pk.getPublicKey(function (ownkey) {
                        var pubs = [ ownkey, somekey ];
                        function callback(cipherObj, symkeys) {
                            // TODO: do something with the rewrapped symkeys
                            // e.g. store them in a hidden text field.
                            window.result = {};
                            window.result.symkeys = symkeys;
                            window.result.cipherObject = cipherObj;

                            // store the cipher text and the iv in the DOM
                            $('#textarea-post-new').val(cipherObj.cipherText);
                            // TODO
                        }
                        encrypt($('#textarea-post-new').text(), pubs, callback);
                    });
                }
            });
        }
    };
}());
