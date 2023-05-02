<script>
	import TreeList from './lib/TreeList.svelte';

	const url_root = "API_ROOT_URL"

	async function GetStaffDirectory(){
		const url = url_root + "staffdirectory";
		console.log(url);
		const response =  await fetch(url, {method: "GET"});
		if(response.ok){
			return response.json();
		}
		else{
			throw new Error(response.text());
		}
	}

	let promise =  GetStaffDirectory();

</script>

{#await promise then root}
	<TreeList {root} childProperty="subordinates"/>
{:catch error} 
	<p style="color: red">{error.message}</p>
{/await}
	