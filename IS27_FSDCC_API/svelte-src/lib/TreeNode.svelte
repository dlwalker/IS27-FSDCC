<script>
	export let node;
	export let childProp = "children";
	
	let childNodes = node[childProp];
</script>

<div>
	<slot {node} />
	{#if childNodes && childNodes.length}
		<div class="children">
			{#each childNodes as child}
				<svelte:self node={child} {childProp} let:node>
          <slot {node} />
				</svelte:self>
			{/each}
		</div>
	{/if}
</div>


<style>
	div {border: 1px solid}
</style>