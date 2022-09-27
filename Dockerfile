FROM nginx:stable-alpine
COPY ./hack/nginx.conf /etc/nginx/nginx.conf
ADD . /var/app/direct-editor-demos

# docker build . -t direct-editor-demos:0.0.1
# docker run -dp 3001:80 direct-editor-demos:0.0.1
# 访问 http://127.0.0.1:3001/examples/demo1/index.html