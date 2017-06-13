var log4js = require('log4js');
var fs = require('fs');

(function() {

    var initLogger = log4js.getLogger();
    initLogger.info('Initializing LOG4JS ...');

    if (!fs.existsSync('logs')){
        initLogger.info('Creating missing logs/ default directory.');
        fs.mkdirSync('logs');
    }

    var config = require(__config+'/log4js.json');
    config.reloadSecs = 300;
    log4js.configure(config);

    config.loggers.forEach(function(logger) {
        initLogger.info('Configuring logger for category: '+ (logger.category || 'default')+', level: '+(logger.level || 'default'));
        var log = log4js.getLogger(logger.category);
        if(logger.level) {
            log.setLevel(logger.level);
        }
    });

    module.exports = log4js;

})();

