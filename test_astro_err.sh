npm run dev > astro_dev.log 2>&1 &
PID=$!
sleep 5
curl -s http://localhost:4321/ > /dev/null
sleep 2
kill $PID
cat astro_dev.log
