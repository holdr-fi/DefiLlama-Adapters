const { request, gql } = require("graphql-request")
const sdk = require("@defillama/sdk");

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/kyzooghost/balancer_aurora_fork'
const balances = {}
const query = gql`
query poolTokens($skip: Int!, $orderDirection: String!) {
    poolTokens(
        first: 1000, 
        skip: $skip, 
        orderBy: balance, 
        orderDirection: $orderDirection, 
        where: { balance_gt: 0 } 
    ) {
        decimals
        address
    }
}
`

async function tvl(time, ethBlock, chainBlocks) {
    const data = await Promise.all([
        _getTokensQuery(0, 'asc'),
        _getTokensQuery(1000, 'asc'),
        _getTokensQuery(2000, 'asc'),
        _getTokensQuery(3000, 'asc'),
        _getTokensQuery(4000, 'asc'),
        _getTokensQuery(5000, 'asc'),
        _getTokensQuery(0, 'desc'),
        _getTokensQuery(1000, 'desc'),
        _getTokensQuery(2000, 'desc'),
        _getTokensQuery(3000, 'desc'),
        _getTokensQuery(4000, 'desc'),
        _getTokensQuery(5000, 'desc'),
      ]);

    const tokenSet = data.reduce((runningTokenSet, poolTokensCollection) => {
      poolTokensCollection.reduce((innerTokenSet, tokenInfo) => {
        innerTokenSet.add(tokenInfo?.address);
        return innerTokenSet;
      }, runningTokenSet);
      return runningTokenSet;
    }, new Set());

    const tokenArray = Array.from(tokenSet);

    const { output } = await sdk.api.abi.multiCall({
      calls: tokenArray.map(t => ({
          target: t,
          params: t
      })),
      abi: 'erc20:balanceOf',
      chain: 'aurora',
      block: chainBlocks['aurora'],
    })

    output.forEach((o => {
      sdk.util.sumSingleBalance(balances, `aurora:${o.input.target}`, o.output)
    }))

    // return mapping from token address to nonzero raw balance
    return balances
}

const _getTokensQuery = async (skip, orderDirection) => {
    const { poolTokens } = await request(SUBGRAPH_URL, query, {
        skip,
        orderDirection
    })
    return poolTokens
}

module.exports = {
    aurora: {
        tvl
    }
}