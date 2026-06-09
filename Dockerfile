FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy template — nginx entrypoint runs envsubst on /etc/nginx/templates/*.template automatically
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
