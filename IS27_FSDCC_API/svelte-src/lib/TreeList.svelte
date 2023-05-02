<script>
	import TreeNode from './TreeNode.svelte';
	
	export let root;
	export let childProperty="children";
</script>


<TreeNode node={root} childProp={childProperty} let:node>
	<span>
		Title: {node.title}<br>
		Position Number: {node.positionNumber}
	</span>
</TreeNode>

<style>
</style>