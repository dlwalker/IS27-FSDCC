<script>
	import TreeNode from './TreeNode.svelte';
	
	export let root;
	export let childProperty="children";
</script>


<TreeNode node={root} childProp={childProperty} let:node>
    <div class="nodeContent">
        <span>
            Title: {node.title}<br>
            Position Number: {node.positionNumber}
        </span>
        <span>
            {#if node.employee}
                Employee Number: {node.employee.employeeNumber}<br>
                Name: {node.employee.firstName} {node.employee.lastName}
            {:else}
                Vacant
            {/if}
        </span>
    </div>
</TreeNode>

<style>
    .nodeContent {
        display: flex;
        padding: 1em;
    }
    .nodeContent > span {
        width: 50%;
    }
</style>