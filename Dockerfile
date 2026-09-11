FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Defaults fuer envsubst. Ueberschreibbar per environment.
ENV DNS_RESOLVER=127.0.0.11
ENV RECONNECT_INTERVAL=5

# Copy template — nginx entrypoint runs envsubst on /etc/nginx/templates/*.template automatically
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 3000
