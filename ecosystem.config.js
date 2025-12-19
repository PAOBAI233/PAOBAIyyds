
module.exports = {

  apps: [{

    name: 'paobai-restaurant',

    script: 'server.js',

    cwd: '/www/wwwroot/paobai.cn',

    instances: 'max',

    exec_mode: 'cluster',

    env: {

      NODE_ENV: 'production'

    },

    error_file: './logs/pm2-error.log',

    out_file: './logs/pm2-out.log',

    log_file: './logs/pm2-combined.log',

    time: true,

    max_memory_restart: '1G',

    node_args: '--max_old_space_size=1024',

    watch: false,

    ignore_watch: ['node_modules', 'logs', 'uploads']

  }]

};

