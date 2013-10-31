
// These formatting functions are modified version of the Dygraphs source.

var DateTimeFormatter = {
    Zeropad: function(x) {
        if (x < 10) {
            return "0" + x;
        } else {
            return "" + x;
        }
    },
    TimeString: function(date) {
        var Zeropad = DateTimeFormatter.Zeropad;
        var d = new Date(date);
        if (d.getSeconds()) {
            return Zeropad(d.getHours()) + ":" +
                    Zeropad(d.getMinutes()) + ":" +
                    Zeropad(d.getSeconds()) + "." +
                    Zeropad(d.getMilliseconds());
        } else {
            return Zeropad(d.getHours()) + ":" + Zeropad(d.getMinutes());
        }
    },
    Format: function(date) {
        var Zeropad = DateTimeFormatter.Zeropad;
        var d = new Date(date);

        // Get the year:
        var year = "" + d.getFullYear();
        // Get a 0 padded month string
        var month = Zeropad(d.getMonth() + 1);  //months are 0-offset, sigh
        // Get a 0 padded day string
        var day = Zeropad(d.getDate());

        var ret = "";
        var frac = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        if (frac)
            ret = " " + DateTimeFormatter.TimeString(date);

        return year + "/" + month + "/" + day + ret;
    }
};