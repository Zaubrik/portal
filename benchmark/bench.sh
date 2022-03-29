# TODO: Add more benchmarks

declare -a arr=("portal.ts" "oak.ts" "abc.ts")

echo Running benchmarks

for i in "${arr[@]}"; do
  printf "\n$i\n"
  deno run -A --no-check $i &
  # NOTE: Adjust sleep when running the first time.
  sleep 2
  wrk -c 100 -d 40 http://localhost:1234
  kill $!
done
