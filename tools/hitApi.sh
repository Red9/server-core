for run in {1..40}
do
	/usr/bin/time -f "%e" wget --quiet --output-document - 'http://api.redninesensor.com/dataset/479de4e6-870d-a55a-255e-4eefadd5e519/panel?buckets=1000&format=csv&nocache' > /dev/null
done
