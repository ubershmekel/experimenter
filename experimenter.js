/*

ab-test.js

JS Snippet for AB testing with Google Analytics events, or Facebook pixel events.

*/


var docCookies = {
    /*\
    |*|
    |*|  :: cookies.js ::
    |*|
    |*|  A complete cookies reader/writer framework with full unicode support.
    |*|
    |*|  Revision #3 - July 13th, 2017
    |*|
    |*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
    |*|  https://developer.mozilla.org/User:fusionchess
    |*|  https://github.com/madmurphy/cookies.js
    |*|
    |*|  This framework is released under the GNU Public License, version 3 or later.
    |*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
    |*|
    |*|  Syntaxes:
    |*|
    |*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
    |*|  * docCookies.getItem(name)
    |*|  * docCookies.removeItem(name[, path[, domain]])
    |*|  * docCookies.hasItem(name)
    |*|  * docCookies.keys()
    |*|
    \*/
    getItem: function (sKey) {
        if (!sKey) { return null; }
        return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    },
    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
        if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
        var sExpires = "";
        if (vEnd) {
            switch (vEnd.constructor) {
                case Number:
                    sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
                    /*
                    Note: Despite officially defined in RFC 6265, the use of `max-age` is not compatible with any
                    version of Internet Explorer, Edge and some mobile browsers. Therefore passing a number to
                    the end parameter might not work as expected. A possible solution might be to convert the the
                    relative time to an absolute time. For instance, replacing the previous line with:
                    */
                    /*
                    sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; expires=" + (new Date(vEnd * 1e3 + Date.now())).toUTCString();
                    */
                    break;
                case String:
                    sExpires = "; expires=" + vEnd;
                    break;
                case Date:
                    sExpires = "; expires=" + vEnd.toUTCString();
                    break;
            }
        }
        document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
        return true;
    },
    removeItem: function (sKey, sPath, sDomain) {
        if (!this.hasItem(sKey)) { return false; }
        document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
        return true;
    },
    hasItem: function (sKey) {
        if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
        return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    },
    keys: function () {
        var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
        for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
        return aKeys;
    }
};

function eventAll(eventName) {
    if (window.gtag) {
        gtag('event', eventName);
    } else if (window.ga) {
        ga('send', {
            hitType: 'event',
            eventCategory: 'general', // `general` is used by the new google `gtag`
            eventAction: eventName,
            //eventLabel: '',
        });
    }
    if (window.fbq) {
        fbq('trackCustom', eventName);
    }
}

function selectVariant(variants) {
    var raffle = Math.random();
    var weightsTotal = 0;
    for (var i = 0; i < variants.length; i++) {
        weightsTotal += variants[i].weight;
        if (raffle < weightsTotal) {
            return variants[i];
        }
    }
    // None of the given variants was selected, this is impossible
    throw new Error('invalid variants, non selected');
}

function testCookies() {
    var testValue = 'anythingiseverything';
    var testKey = 'testkey'
    docCookies.setItem(testKey, testValue);
    var result = docCookies.getItem(testKey);
    if (result !== testValue) {
        console.warn('Cookies are not working :(');
    }
}

function addBaselineVariant(variants) {
    var weightsTotal = 0;
    var newVariants = [];
    for (var i = 0; i < variants.length; i++) {
        weightsTotal += variants[i].weight;
        newVariants.push(variants[i]);
    }
    if (weightsTotal > 1.0) {
        console.warn('Invalid variants, weights total is over 1.0', weightsTotal);
        return;
    }
    if (weightsTotal < 1.0) {
        newVariants.push({
            weight: 1.0 - weightsTotal,
            name: 'baseline',
            activate: function() {},
        });
    }
    return newVariants;
}

function cookieName(experiment) {
    var sep = '_';
    return 'experiment' + sep + experiment.name;
}

function initExperiment(experiment) {
    // If a cookie is present - activate that variant, otherwise:
    // Choose which variant to activate
    // Write down a cookie
    // Activate the variant.
    // Make an event
    // `experiment` is an object:
    // {name, variants, domain}
    // `variants` is an array of:
    // {
    //     name: string,
    //     weight: number,
    //     activate: function,
    // }
    var sep = '_';
    var cookieKey = cookieName(experiment);
    var cookieValue = docCookies.getItem(cookieKey);
    variants = addBaselineVariant(experiment.variants);
    var activeVariant = null;
    if (cookieValue) {
        for (var i = 0; i < variants.length; i++) {
            if (cookieValue === variants[i].name) {
                activeVariant = variants[i];
                break;
            }
        }
        if (!activeVariant) {
            console.warn('Had a cookie for the experiment but the variant was missing', cookieName, cookieValue);
        }
    }
    if (!activeVariant) {
        activeVariant = selectVariant(variants);
    }
    activeVariant.activate();
    var cookieEnd = Infinity;
    docCookies.setItem(cookieKey, activeVariant.name, cookieEnd, experiment.path, experiment.domain);
    var eventName = 'experiment' + sep + experiment.name + sep + activeVariant.name;
    eventAll(eventName);
}

function clearExperiment(experiment) {
    var cookieKey = cookieName(experiment);
    docCookies.removeItem(cookieKey, experiment.path, experiment.domain);
}

testCookies();