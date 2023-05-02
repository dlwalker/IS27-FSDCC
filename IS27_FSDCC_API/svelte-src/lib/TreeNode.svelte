<script>
	export let node;
	export let childProp = "children";
	
	let childNodes = node[childProp];
</script>

<div class="node-outer">
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
	.node-outer {
        border: 2px solid;
        margin: 5px 5px 1px;
    }
</style>