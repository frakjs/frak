export default {
    server: 'server',
    root: '/var/www/com.example.app',
    after: 'composer install --no-dev ; php artisan migrate --force ; php artisan cache:clear ; php artisan view:clear ; php artisan route:clear',
    init: {
        after: 'composer install --no-dev ; [ -f .env ] || cp .env.example .env ; php artisan key:generate ; php artisan migrate --force',
    },
};
