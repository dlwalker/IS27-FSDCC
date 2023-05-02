<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    function Close(event) {
        dispatch('close', event);
}
    export let title = '';
    export let items = [];
</script>


<div class="modal-background">
        <div class="list-container">
            <p class="title-section">
                <span>{title}</span>
                <button class="close-button" on:click={Close}>Close</button>
            </p>
            {#each items as item}
            <span>
                <slot {item}/>
            </span>
            {/each}
        </div>
</div>

<style>
    .list-container {
        position: fixed;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 60%;
        max-width: 32em;
        max-height: 80%;
		border: 2px solid;
		background-color: white;
		padding: 1em;
        overflow: auto;
    }
    .title-section {
        display: flex;
        justify-content: space-between;
    }
    .list-container > span {
        display: flex;
        justify-content: space-between;
		border: 2px solid;
        margin-bottom: 5px;
        padding: 0.5em;
    }
    .modal-background {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>