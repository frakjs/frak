export default {
    server: 'server',
    root: '/var/www/become',
    become: true,
    after: 'ls -l',
    guest: {
        become: 'guest',
    },
};
